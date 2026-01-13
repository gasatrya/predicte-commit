import * as vscode from 'vscode';
import { getConfig, SECRET_KEY } from './config';
import { getGitExtension } from './vscodeGit';
import { getTargetRepository } from './repoTarget';
import { toRepoRelativePosixPath } from './paths';
import { isIgnored } from './ignore';
import { getStagedDiff } from './stagedDiff';
import { capDiffsByFileAndTotal } from './truncate';
import { SYSTEM_PROMPT } from './prompt';
import { generateCommitMessage, ProviderError } from './provider';
import { logDebug } from './logging';

export async function setApiKeyCommand(context: vscode.ExtensionContext): Promise<void> {
	const key = await vscode.window.showInputBox({
		prompt: 'Enter your Mistral API key',
		password: true,
		ignoreFocusOut: true,
		validateInput: v => (v.trim().length === 0 ? 'API key cannot be empty' : undefined)
	});
	if (!key) {
		return;
	}
	await context.secrets.store(SECRET_KEY, key.trim());
	vscode.window.showInformationMessage('Mistral API key saved.');
}

function showMissingKeyNotification(context: vscode.ExtensionContext): void {
	void vscode.window
		.showErrorMessage('Mistral API key is not set.', 'Set Mistral Key', 'Open Settings')
		.then(async choice => {
			if (choice === 'Set Mistral Key') {
				await setApiKeyCommand(context);
			}
			if (choice === 'Open Settings') {
				await vscode.commands.executeCommand('workbench.action.openSettings', 'predicteCommit');
			}
		});
}

export async function maybePromptForApiKeyOnStartup(context: vscode.ExtensionContext): Promise<void> {
	const hasPrompted = context.globalState.get<boolean>('predicteCommit.didPromptForKey', false);
	if (hasPrompted) {
		return;
	}

	const key = await context.secrets.get(SECRET_KEY);
	if (key && key.trim().length > 0) {
		return;
	}

	context.globalState.update('predicteCommit.didPromptForKey', true);
	showMissingKeyNotification(context);
}

function sanitizeCommitMessage(raw: string): string {
	let s = raw.trim();

	// Strip fenced code blocks if the model ignored the prompt.
	// Handles:
	// ```
	// message
	// ```
	// and
	// ```text
	// message
	// ```
	if (s.startsWith('```')) {
		const firstNewline = s.indexOf('\n');
		if (firstNewline !== -1) {
			s = s.slice(firstNewline + 1);
		}
		const lastFence = s.lastIndexOf('```');
		if (lastFence !== -1) {
			s = s.slice(0, lastFence);
		}
	}

	return s.trim();
}

const CONVENTIONAL_HEADER_RE =
	/^(feat|fix|docs|chore|refactor|test|perf|build|ci|style|revert)(\([^)]+\))?:\s+.+/;

function normalizeCommitMessage(raw: string): string {
	const s = sanitizeCommitMessage(raw);
	const lines = s
		.split(/\r?\n/)
		.map(l => l.trimEnd())
		.filter(l => l.trim().length > 0);

	if (lines.length === 0) {
		return s;
	}

	const subject = lines[0];
	const bodyBullets: string[] = [];

	for (const line of lines.slice(1)) {
		if (CONVENTIONAL_HEADER_RE.test(line)) {
			bodyBullets.push(`- ${line}`);
			continue;
		}
		if (line.startsWith('- ')) {
			bodyBullets.push(line);
			continue;
		}
		bodyBullets.push(`- ${line}`);
	}

	if (bodyBullets.length === 0) {
		return subject;
	}
	return `${subject}\n\n${bodyBullets.join('\n')}`;
}

export async function generateMessageCommand(context: vscode.ExtensionContext, contextArg?: unknown): Promise<void> {
	const cfg = getConfig();
	const gitExt = getGitExtension();
	const git = gitExt.getAPI(1);

	const repo = await getTargetRepository(git, contextArg);
	if (!repo) {
		vscode.window.showErrorMessage('No git repository found.');
		return;
	}

	const staged = repo.state.indexChanges;
	if (staged.length === 0) {
		vscode.window.showInformationMessage(`No staged changes found in ${repo.rootUri.fsPath}.`);
		return;
	}

	const repoRoot = repo.rootUri.fsPath;

	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.SourceControl, title: 'Generating commit message...', cancellable: false },
		async () => {
			logDebug(cfg.debugLogging, [
				'[predicteCommit] generateMessage start',
				`repo: ${repo.rootUri.fsPath}`,
				`stagedFiles: ${staged.length}`
			]);

			const skipped: Array<{ file: string; pattern: string }> = [];
			const diffs: Array<{ header: string; diff: string }> = [];

			for (const change of staged) {
				const rel = toRepoRelativePosixPath(repoRoot, change.uri.fsPath);
				const matched = cfg.ignoredFiles.find(p => isIgnored(rel, [p]));
				if (matched) {
					skipped.push({ file: rel, pattern: matched });
					continue;
				}
				const header = `# File: ${rel}`;
				const diff = await getStagedDiff(repo, change.uri);
				diffs.push({ header, diff });
			}

			if (diffs.length === 0) {
				vscode.window.showInformationMessage('All staged changes were ignored by settings.');
				return;
			}

			logDebug(cfg.debugLogging, [
				`includedFiles: ${diffs.length}`,
				`skippedFiles: ${skipped.length}`,
				...skipped.map(s2 => `skipped: ${s2.file} (pattern: ${s2.pattern})`)
			]);

			const boundedDiff = capDiffsByFileAndTotal(diffs);
			logDebug(cfg.debugLogging, [
				'--- systemPrompt ---',
				SYSTEM_PROMPT,
				'--- userPrompt (Diff) ---',
				`Diff:\n${boundedDiff}`
			]);

			const provider = cfg.useLocal
				? { kind: 'local' as const, baseUrl: cfg.localBaseUrl, model: cfg.localModel }
				: { kind: 'cloud' as const, apiKey: (await context.secrets.get(SECRET_KEY)) ?? '', modelPriority: cfg.modelPriority };
			logDebug(cfg.debugLogging, [
				`provider: ${provider.kind}`,
				provider.kind === 'local' ? `localBaseUrl: ${provider.baseUrl}` : `modelPriority: ${provider.modelPriority.join(', ')}`
			]);

			if (provider.kind === 'cloud' && provider.apiKey.trim().length === 0) {
				showMissingKeyNotification(context);
				return;
			}

			let message: string;
			try {
				message = await generateCommitMessage(provider, SYSTEM_PROMPT, boundedDiff);
			} catch (e) {
				const err = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : 'Provider error');
				if (err.status === 401 || err.status === 403) {
					showMissingKeyNotification(context);
					return;
				}
				vscode.window.showErrorMessage(err.message);
				return;
			}

			repo.inputBox.value = normalizeCommitMessage(message);
		}
	);
}
