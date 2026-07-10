export interface TimeLinkSettings {
	enableKanban: boolean;
	calendarFolderPath: string;
}

export const DEFAULT_SETTINGS: TimeLinkSettings = {
	enableKanban: true,
	calendarFolderPath: 'Timelink-Calendar',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeCalendarFolderPath = (value: unknown): string => {
	if (typeof value !== 'string') return DEFAULT_SETTINGS.calendarFolderPath;

	const segments: string[] = [];
	for (const segment of value.trim().replace(/\\/g, '/').split('/')) {
		if (!segment || segment === '.') continue;
		if (segment === '..') {
			segments.pop();
			continue;
		}
		segments.push(segment);
	}

	return segments.join('/') || DEFAULT_SETTINGS.calendarFolderPath;
};

export const normalizeTimeLinkSettings = (value: unknown): TimeLinkSettings => {
	if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

	return {
		enableKanban:
			typeof value.enableKanban === 'boolean' ? value.enableKanban : DEFAULT_SETTINGS.enableKanban,
		calendarFolderPath: normalizeCalendarFolderPath(value.calendarFolderPath),
	};
};
