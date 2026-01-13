import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import { truncateWithMarker } from '../truncate';
import { isTransientStatus, isAuthOrConfigStatus } from '../provider';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('truncateWithMarker appends marker', () => {
		const out = truncateWithMarker('abcdef', 5);
		assert.ok(out.length <= 5);
		assert.ok(out.includes('...') || out.length === 5);
	});

	test('error classification', () => {
		assert.strictEqual(isTransientStatus(429), true);
		assert.strictEqual(isTransientStatus(503), true);
		assert.strictEqual(isTransientStatus(401), false);
		assert.strictEqual(isAuthOrConfigStatus(401), true);
		assert.strictEqual(isAuthOrConfigStatus(400), true);
	});
});
