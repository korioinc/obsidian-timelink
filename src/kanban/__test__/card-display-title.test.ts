import { resolveCardDisplayTitle } from '../utils/card-display-title.ts';
import { assert, test } from 'vitest';

void test('resolveCardDisplayTitle returns plain title as-is', () => {
	assert.strictEqual(resolveCardDisplayTitle('레포 정리', 'fallback'), '레포 정리');
});

void test('resolveCardDisplayTitle prefers wiki-link alias when present', () => {
	assert.strictEqual(
		resolveCardDisplayTitle('[[1_재성이/attachments/test.md|재성이이잉]]', 'test'),
		'재성이이잉',
	);
});

void test('resolveCardDisplayTitle falls back to basename when alias is missing', () => {
	assert.strictEqual(resolveCardDisplayTitle('[[1_재성이/attachments/test.md]]', 'test'), 'test');
});

void test('resolveCardDisplayTitle keeps mixed non-link title text unchanged', () => {
	assert.strictEqual(
		resolveCardDisplayTitle('작업 [[1_재성이/attachments/test.md|재성이이잉]]', 'test'),
		'작업 [[1_재성이/attachments/test.md|재성이이잉]]',
	);
});
