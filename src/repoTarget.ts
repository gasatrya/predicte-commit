import * as vscode from 'vscode';
import type { GitAPI, Repository } from './vscodeGit';

export async function getTargetRepository(git: GitAPI, contextArg?: unknown): Promise<Repository | undefined> {
	// 1) Context click from SCM multi-repo root
	const arg = contextArg as { rootUri?: vscode.Uri } | undefined;
	if (arg?.rootUri) {
		return git.repositories.find(r => r.rootUri.toString() === arg.rootUri!.toString());
	}

	// 2) Active editor
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const repo = git.getRepository(editor.document.uri);
		if (repo) {
			return repo;
		}
	}

	// 3) Single repo default
	if (git.repositories.length === 1) {
		return git.repositories[0];
	}

	// 4) Quick pick
	if (git.repositories.length > 1) {
		const picked = await vscode.window.showQuickPick(
			git.repositories.map(r => ({
				label: vscode.workspace.asRelativePath(r.rootUri.fsPath, false) || r.rootUri.fsPath,
				repo: r
			})),
			{ placeHolder: 'Select a repository' }
		);
		return picked?.repo;
	}

	return undefined;
}
