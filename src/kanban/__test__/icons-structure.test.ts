/* eslint-disable import/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

void test('cross icon path string is declared once', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../..');
	const source = readFileSync(path.join(projectRoot, 'src/kanban/_components/icons.tsx'), 'utf8');

	const crossPath = 'M6 6l12 12M18 6l-12 12';
	const occurrences = source.split(crossPath).length - 1;
	assert.equal(occurrences, 1);
});
