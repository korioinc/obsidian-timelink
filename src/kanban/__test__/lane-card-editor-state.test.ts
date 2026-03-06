/* eslint-disable import/no-nodejs-modules */
import { normalizeCardTitle } from '../hooks/use-lane-card-editor-state.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('normalizeCardTitle trims and normalizes line endings', () => {
	const normalized = normalizeCardTitle('  first\r\nsecond\r\n  ');
	assert.equal(normalized, 'first\nsecond');
});

void test('normalizeCardTitle returns empty string for whitespace-only values', () => {
	assert.equal(normalizeCardTitle('  \r\n  '), '');
});
