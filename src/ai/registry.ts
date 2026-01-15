import type * as vscode from 'vscode';
import type { PredicteCommitConfig } from '../core/types';
import type { ProviderClient } from './types';

export interface ProviderDefinition {
  /** Unique ID for the provider (matches 'predicteCommit.provider' setting value) */
  id: string;
  /** Human-readable label for UI */
  label: string;
  /** Configuration key for the API key (if applicable) */
  configKey?: string;
  /** Factory method to create the provider instance */
  create(context: vscode.ExtensionContext, config: PredicteCommitConfig): Promise<ProviderClient>;
}

/**
 * Registry to hold all available providers.
 * We'll populate this in the individual provider files or import them here.
 * For now, we'll export an empty array and let valid providers be added.
 */
export const PROVIDER_REGISTRY: ProviderDefinition[] = [];

export function registerProvider(def: ProviderDefinition) {
  PROVIDER_REGISTRY.push(def);
}

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}
