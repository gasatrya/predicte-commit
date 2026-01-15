import * as assert from 'assert';
import { getEffectiveProviderId, getConfig, PredicteCommitConfig } from '../core/config';

suite('Config Test Suite', () => {
    test('getEffectiveProviderId', () => {
        // Test 1: useLocal is true -> should return 'local' (backward compatibility)
        const cfgLocal: PredicteCommitConfig = {
            provider: 'mistral',
            useLocal: true,
            models: [],
            ignoredFiles: [],
            localBaseUrl: '',
            localModel: '',
            debugLogging: false
        };
        assert.strictEqual(getEffectiveProviderId(cfgLocal), 'local');

        // Test 2: useLocal is false -> should return provider
        const cfgMistral: PredicteCommitConfig = {
            ...cfgLocal,
            useLocal: false,
            provider: 'mistral'
        };
        assert.strictEqual(getEffectiveProviderId(cfgMistral), 'mistral');

        // Test 3: provider is local (explicit)
        const cfgLocalExplicit: PredicteCommitConfig = {
            ...cfgLocal,
            useLocal: false,
            provider: 'local'
        };
        assert.strictEqual(getEffectiveProviderId(cfgLocalExplicit), 'local');
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
    });
});
