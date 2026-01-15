import * as assert from 'assert';
import { getConfig } from '../../core/config';
import { PredicteCommitConfig } from '../../core/types';
import { getEffectiveProviderId } from '../../core/logic';
import { DEFAULT_LOCAL_URL } from '../../core/constants';

suite('Config Test Suite', () => {
    test('getEffectiveProviderId', () => {
        // Test 1: useLocal is true -> should return 'ollama' (renamed from local)
        const cfgLocal: PredicteCommitConfig = {
            provider: 'mistral',
            useLocal: true,
            models: [],
            ignoredFiles: [],
            localBaseUrl: '',
            localModel: '',
            debugLogging: false
        };
        assert.strictEqual(getEffectiveProviderId(cfgLocal), 'ollama');

        // Test 2: useLocal is false -> should return provider
        const cfgMistral: PredicteCommitConfig = {
            ...cfgLocal,
            useLocal: false,
            provider: 'mistral'
        };
        assert.strictEqual(getEffectiveProviderId(cfgMistral), 'mistral');

        // Test 3: provider is ollama (explicit)
        const cfgLocalExplicit: PredicteCommitConfig = {
            ...cfgLocal,
            useLocal: false,
            provider: 'ollama'
        };
        assert.strictEqual(getEffectiveProviderId(cfgLocalExplicit), 'ollama');
    });

    test('getConfig defaults', () => {
        // This test relies on the mock implementation of vscode.workspace.getConfiguration
        // defined in unit-test-setup.js
        const cfg = getConfig();
        // The mock returns the default value passed to .get(key, default)
        // config.ts: cfg.get<string>('provider', 'mistral')
        assert.strictEqual(cfg.provider, 'mistral');
        assert.strictEqual(cfg.useLocal, false);
        assert.deepStrictEqual(cfg.ignoredFiles, ['*-lock.json', '*.svg', 'dist/**']);
        assert.strictEqual(cfg.localBaseUrl, DEFAULT_LOCAL_URL);
        assert.strictEqual(cfg.localModel, '');
    });
});
