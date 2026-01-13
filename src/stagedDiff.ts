import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Repository } from './vscodeGit';
import { toRepoRelativePosixPath } from './paths';

const execFileAsync = promisify(execFile);

async function gitDiffCached(repoRootFsPath: string, repoRelPosixPath: string): Promise<string> {
	const { stdout } = await execFileAsync('git', ['diff', '--cached', '--', repoRelPosixPath], {
		cwd: repoRootFsPath,
		maxBuffer: 50 * 1024 * 1024
	});
	return stdout;
}

// Best-effort: Git API surface differs across VS Code versions; fallback to git CLI.
export async function getStagedDiff(repository: Repository, fileUri: vscode.Uri): Promise<string> {
	const repoRoot = repository.rootUri.fsPath;
	const repoRelPosixPath = toRepoRelativePosixPath(repoRoot, fileUri.fsPath);

	// Try common API shapes first.
	const repoAny = repository as unknown as {
		diffIndexWithHEAD?: (path?: string) => Promise<string>;
		diffWithHEAD?: (path?: string) => Promise<string>;
		diff?: (cached: boolean, path?: string) => Promise<string>;
	};

	try {
		if (typeof repoAny.diffIndexWithHEAD === 'function') {
			// Some versions: diffIndexWithHEAD(path?: string)
			return await repoAny.diffIndexWithHEAD(repoRelPosixPath);
		}
		if (typeof repoAny.diffWithHEAD === 'function') {
			// Some versions: diffWithHEAD(path?: string)
			return await repoAny.diffWithHEAD(repoRelPosixPath);
		}
		if (typeof repoAny.diff === 'function') {
			// Some versions: diff(cached: boolean, path?: string)
			return await repoAny.diff(true, repoRelPosixPath);
		}
	} catch {
		// Fall through to CLI.
	}

	return await gitDiffCached(repoRoot, repoRelPosixPath);
}
