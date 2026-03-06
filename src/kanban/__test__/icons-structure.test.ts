import iconsSource from '../_components/icons.tsx?raw';
import { assert, test } from 'vitest';

void test('cross icon path string is declared once', () => {
	const crossPath = 'M6 6l12 12M18 6l-12 12';
	const occurrences = iconsSource.split(crossPath).length - 1;
	assert.strictEqual(occurrences, 1);
});
