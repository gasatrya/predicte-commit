import * as assert from 'assert';
import { getEffectiveProviderId } from '../../core/logic';
import { PredicteCommitConfig } from '../../core/types';

suite('Logic Test Suite', () => {
  const defaultConfig: PredicteCommitConfig = {
    provider: 'mistral',
    models: [],
    ignoredFiles: [],
    useLocal: false,
    localProvider: 'ollama',
    localBaseUrl: '',
    localModel: '',
    debugLogging: false,
  };

  test('getEffectiveProviderId returns provider when useLocal is false', () => {
    const config: PredicteCommitConfig = { ...defaultConfig, useLocal: false, provider: 'custom-provider' };
    assert.strictEqual(getEffectiveProviderId(config), 'custom-provider');
  });

  test('getEffectiveProviderId returns localProvider when useLocal is true', () => {
    const config: PredicteCommitConfig = { ...defaultConfig, useLocal: true, localProvider: 'vllm' };
    assert.strictEqual(getEffectiveProviderId(config), 'vllm');
  });

  test('getEffectiveProviderId trims localProvider', () => {
    const config: PredicteCommitConfig = { ...defaultConfig, useLocal: true, localProvider: '  lmstudio  ' };
    assert.strictEqual(getEffectiveProviderId(config), 'lmstudio');
  });

  test('getEffectiveProviderId returns ollama when useLocal is true and localProvider is empty', () => {
    const config: PredicteCommitConfig = { ...defaultConfig, useLocal: true, localProvider: '' };
    assert.strictEqual(getEffectiveProviderId(config), 'ollama');
  });

  test('getEffectiveProviderId returns ollama when useLocal is true and localProvider is only whitespace', () => {
    const config: PredicteCommitConfig = { ...defaultConfig, useLocal: true, localProvider: '   ' };
    assert.strictEqual(getEffectiveProviderId(config), 'ollama');
  });
});
