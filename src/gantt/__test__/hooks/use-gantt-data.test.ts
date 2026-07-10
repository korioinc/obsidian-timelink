import { subscribeToGanttCalendarDirectory } from '../../hooks/use-gantt-data.ts';
import { assert, test, vi } from 'vitest';

void test('subscribeToGanttCalendarDirectory publishes current and changed directories', () => {
	let directory = 'Calendar/Old';
	let listener: () => void = () => undefined;
	const unsubscribe = vi.fn();
	const calendar = {
		getDirectory: () => directory,
		onDirectoryChange: (nextListener: () => void) => {
			listener = nextListener;
			return unsubscribe;
		},
	};
	const observed: string[] = [];

	const stop = subscribeToGanttCalendarDirectory(calendar, (nextDirectory) => {
		observed.push(nextDirectory);
	});
	directory = 'Calendar/New';
	listener();
	stop();

	assert.deepEqual(observed, ['Calendar/Old', 'Calendar/New']);
	assert.strictEqual(unsubscribe.mock.calls.length, 1);
});
