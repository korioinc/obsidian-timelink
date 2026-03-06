const KANBAN_SETTINGS_SENTINEL = '%% kanban:settings';

type SettingsFooterRange = {
	sentinelIndex: number;
	openingFenceIndex: number;
	closingFenceIndex: number;
	endSentinelIndex: number;
};

function findSettingsFooterRange(lines: string[]): SettingsFooterRange | null {
	let endSentinelIndex = -1;
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '%%') {
			endSentinelIndex = i;
			break;
		}
	}
	if (endSentinelIndex === -1) return null;

	let cursor = endSentinelIndex - 1;
	while (cursor >= 0 && lines[cursor]?.trim() === '') cursor -= 1;
	if (cursor < 0 || lines[cursor]?.trim() !== '```') return null;
	const closingFenceIndex = cursor;

	let openingFenceIndex = -1;
	for (let i = closingFenceIndex - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '```') {
			openingFenceIndex = i;
			break;
		}
	}
	if (openingFenceIndex === -1) return null;

	let sentinelIndex = openingFenceIndex - 1;
	while (sentinelIndex >= 0 && lines[sentinelIndex]?.trim() === '') sentinelIndex -= 1;
	if (sentinelIndex < 0 || lines[sentinelIndex]?.trim() !== KANBAN_SETTINGS_SENTINEL) return null;

	return {
		sentinelIndex,
		openingFenceIndex,
		closingFenceIndex,
		endSentinelIndex,
	};
}

export function stripSettingsFooterFromLines(lines: string[]): string[] {
	const range = findSettingsFooterRange(lines);
	if (!range) return lines;
	return lines.slice(0, range.sentinelIndex);
}

export function extractSettingsFooterJson(markdown: string): string | null {
	const lines = markdown.split('\n');
	const range = findSettingsFooterRange(lines);
	if (!range) return null;

	const jsonText = lines
		.slice(range.openingFenceIndex + 1, range.closingFenceIndex)
		.join('\n')
		.trim();
	return jsonText || null;
}
