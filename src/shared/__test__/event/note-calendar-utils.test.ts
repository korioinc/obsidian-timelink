import { buildEventFilename, toEventFromFrontmatter } from '../../event/note-calendar-utils.ts';
import type { CalendarEvent } from '../../event/types.ts';
import { assert, test } from 'vitest';

const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
	title: 'Sample event',
	allDay: true,
	taskEvent: false,
	date: '2026-03-02',
	...overrides,
});

void test('toEventFromFrontmatter returns defaults without mutating source frontmatter', () => {
	const frontmatter: Partial<CalendarEvent> = {
		date: '2026-03-02',
	};

	const event = toEventFromFrontmatter(frontmatter, 'Sample');

	assert.strictEqual(event.title, 'Sample');
	assert.strictEqual(event.allDay, false);
	assert.strictEqual(frontmatter.title, undefined);
	assert.strictEqual(frontmatter.allDay, undefined);
});

void test('buildEventFilename sanitizes unsupported filename characters', () => {
	const filename = buildEventFilename(
		createEvent({
			title: 'Roadmap / Q2: core*api?<>"|',
		}),
	);
	assert.strictEqual(filename, '2026-03-02 Roadmap Q2 core api.md');
});
