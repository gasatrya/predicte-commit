import * as vscode from 'vscode';

export type PredicteCommitConfig = {
  provider: string;
  modelPriority: string[];
  ignoredFiles: string[];
  useLocal: boolean;
  localBaseUrl: string;
  localModel: string;
  debugLogging: boolean;
};

export function getConfig(): PredicteCommitConfig {
  const cfg = vscode.workspace.getConfiguration('predicteCommit');
  const provider = cfg.get<string>('provider', 'mistral');
  const useLocal = cfg.get<boolean>('useLocal', false);
  return {
    provider,
    modelPriority: cfg.get<string[]>('modelPriority', ['devstral-latest', 'devstral-small-latest']),
    ignoredFiles: cfg.get<string[]>('ignoredFiles', ['*-lock.json', '*.svg', 'dist/**']),
    useLocal,
    localBaseUrl: cfg.get<string>('localBaseUrl', 'http://localhost:11434/v1'),
    localModel: cfg.get<string>('localModel', 'mistral'),
    debugLogging: cfg.get<boolean>('debugLogging', false),
  };
}

export const DIFF_CAPS: { maxCharsPerFile: number; maxCharsTotal: number } = {
  maxCharsPerFile: 8000,
  maxCharsTotal: 32000,
};

export const TRUNCATION_MARKER = '...TRUNCATED...';

export function getEffectiveProviderId(cfg: PredicteCommitConfig): string {
  // Backwards compatibility: existing users may rely on useLocal.
  if (cfg.useLocal) {
    return 'local';
  }
  return cfg.provider;
}
