import { PredicteCommitConfig } from './types';

export function getEffectiveProviderId(cfg: PredicteCommitConfig): string {
  // Backwards compatibility: existing users may rely on useLocal.
  if (cfg.useLocal) {
    return cfg.localProvider?.trim() || 'ollama';
  }
  return cfg.provider;
}
