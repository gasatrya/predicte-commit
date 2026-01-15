import * as assert from 'assert';
import { postChatCompletion } from '../ai/http';
import { ProviderError } from '../ai/errors';

suite('HTTP Error Handling', () => {
    test('ECONNREFUSED returns friendly message', async () => {
        const url = 'http://localhost:11111/v1/chat/completions'; // Port likely closed
        try {
            await postChatCompletion(url, undefined, { model: 'test', messages: [] });
            assert.fail('Should have thrown');
        } catch (e) {
            assert.ok(e instanceof ProviderError, `Expected ProviderError but got ${e}`);
            assert.ok(e.message.includes('Connection refused'), `Expected 'Connection refused' in '${e.message}'`);
            assert.ok(e.message.includes(url), `Expected URL in error message '${e.message}'`);
        }
    });

    test('ENOTFOUND returns friendly message', async () => {
        const url = 'http://nonexistent-domain-xyz.local/v1/chat/completions';
        try {
            await postChatCompletion(url, undefined, { model: 'test', messages: [] });
            assert.fail('Should have thrown');
        } catch (e) {
            assert.ok(e instanceof ProviderError, `Expected ProviderError but got ${e}`);
            assert.ok(e.message.includes('Address not found'), `Expected 'Address not found' in '${e.message}'`);
            assert.ok(e.message.includes(url), `Expected URL in error message '${e.message}'`);
        }
    });
});
