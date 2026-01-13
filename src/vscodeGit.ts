import * as vscode from 'vscode';

export interface GitExtension {
	getAPI(version: 1): GitAPI;
}

export interface GitAPI {
	repositories: Repository[];
	getRepository(uri: vscode.Uri): Repository | null;
}

export interface Repository {
	rootUri: vscode.Uri;
	state: {
		indexChanges: Change[];
	};
	inputBox: {
		value: string;
	};
	// The VS Code git extension API surface changes over time; keep this flexible.
	[key: string]: unknown;
}

export interface Change {
	uri: vscode.Uri;
	originalUri?: vscode.Uri;
}

export function getGitExtension(): GitExtension {
	const ext = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!ext) {
		throw new Error('VS Code Git extension not found.');
	}
	const api = ext.exports;
	if (!api) {
		throw new Error('VS Code Git extension API not available.');
	}
	return api;
}
