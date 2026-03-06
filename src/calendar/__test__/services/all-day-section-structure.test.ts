import dayAllDaySectionSource from '../../_components/day-week/DayAllDaySection.tsx?raw';
import weekAllDaySectionSource from '../../_components/day-week/WeekAllDaySection.tsx?raw';
import { assert, test } from 'vitest';

void test('day and week all-day sections do not use passthrough AllDaySection wrapper', () => {
	assert.strictEqual(dayAllDaySectionSource.includes("from './AllDaySection'"), false);
	assert.strictEqual(weekAllDaySectionSource.includes("from './AllDaySection'"), false);
});
