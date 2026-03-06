import { normalizeCardTitle } from '../hooks/use-lane-card-editor-state.ts';
import { assert, test } from 'vitest';

void test('normalizeCardTitle trims and normalizes line endings', () => {
	const normalized = normalizeCardTitle('  first\r\nsecond\r\n  ');
	assert.strictEqual(normalized, 'first\nsecond');
});

void test('normalizeCardTitle returns empty string for whitespace-only values', () => {
	assert.strictEqual(normalizeCardTitle('  \r\n  '), '');
});
