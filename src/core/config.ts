import * as vscode from 'vscode';
import { PredicteCommitConfig } from './types';
import { EMPTY_BASE_URL } from './constants';

export function getConfig(): PredicteCommitConfig {
  const cfg = vscode.workspace.getConfiguration('predicteCommit');
  const provider = cfg.get<string>('provider', 'mistral');
  const useLocal = cfg.get<boolean>('useLocal', false);
  return {
    provider,
    models: cfg.get<string[]>('models', []),
    ignoredFiles: cfg.get<string[]>('ignoredFiles', ['*-lock.json', '*.svg', 'dist/**']),
    useLocal,
    localProvider: cfg.get<string>('localProvider', 'ollama'),
    localBaseUrl: cfg.get<string>('localBaseUrl', EMPTY_BASE_URL),
    localModel: cfg.get<string>('localModel', ''),
    debugLogging: cfg.get<boolean>('debugLogging', false),
  };
}
