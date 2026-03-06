/* eslint-disable import/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const readSource = (relativePathFromRoot: string) => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	return readFileSync(path.join(projectRoot, relativePathFromRoot), 'utf8');
};

void test('day and week all-day sections do not use passthrough AllDaySection wrapper', () => {
	const daySource = readSource('src/calendar/_components/day-week/DayAllDaySection.tsx');
	const weekSource = readSource('src/calendar/_components/day-week/WeekAllDaySection.tsx');

	assert.equal(daySource.includes("from './AllDaySection'"), false);
	assert.equal(weekSource.includes("from './AllDaySection'"), false);
});
