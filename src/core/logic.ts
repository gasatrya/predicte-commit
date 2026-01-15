import { PredicteCommitConfig } from './types';

export function getEffectiveProviderId(cfg: PredicteCommitConfig): string {
  // Backwards compatibility: existing users may rely on useLocal.
  if (cfg.useLocal) {
    return 'ollama';
  }
  return cfg.provider;
}
