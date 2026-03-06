import type { CalendarEvent } from './types';

const INVALID_FILENAME_CHARS_PATTERN = /[\\/:*?"<>|]/g;

const sanitizeFilenameBasename = (raw: string): string => {
	const normalized = raw
		.replace(INVALID_FILENAME_CHARS_PATTERN, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\.+$/g, '')
		.trim();
	return normalized || 'Untitled event';
};

export const buildEventFilename = (event: CalendarEvent): string => {
	const base = `${event.date ?? ''} ${event.title}`.trim();
	return `${sanitizeFilenameBasename(base)}.md`;
};

export const toEventFromFrontmatter = (
	frontmatter: Partial<CalendarEvent>,
	fallbackTitle: string,
): CalendarEvent => {
	const title =
		typeof frontmatter.title === 'string' && frontmatter.title.trim()
			? frontmatter.title
			: fallbackTitle;
	const allDay = typeof frontmatter.allDay === 'boolean' ? frontmatter.allDay : false;
	return {
		...frontmatter,
		title,
		allDay,
	} as CalendarEvent;
};
