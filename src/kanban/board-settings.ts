export interface KanbanBoardSettings {
	'kanban-color'?: string;
	'show-board-color'?: boolean;
	'show-add-list'?: boolean;
	'show-view-as-markdown'?: boolean;
	'show-search'?: boolean;
	'show-set-view'?: boolean;
}

export const DEFAULT_KANBAN_BOARD_SETTINGS: Required<
	Pick<
		KanbanBoardSettings,
		'show-board-color' | 'show-add-list' | 'show-view-as-markdown' | 'show-search' | 'show-set-view'
	>
> &
	Pick<KanbanBoardSettings, 'kanban-color'> = {
	'show-board-color': true,
	'show-add-list': true,
	'show-view-as-markdown': true,
	'show-search': true,
	'show-set-view': true,
	'kanban-color': undefined,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeBoardSettings(
	settings?: Partial<KanbanBoardSettings>,
): KanbanBoardSettings {
	const filtered: KanbanBoardSettings = {};
	if (!settings) {
		return {
			...DEFAULT_KANBAN_BOARD_SETTINGS,
		};
	}

	if (typeof settings['kanban-color'] === 'string') {
		filtered['kanban-color'] = settings['kanban-color'];
	}
	if (typeof settings['show-board-color'] === 'boolean') {
		filtered['show-board-color'] = settings['show-board-color'];
	}
	if (typeof settings['show-add-list'] === 'boolean') {
		filtered['show-add-list'] = settings['show-add-list'];
	}
	if (typeof settings['show-view-as-markdown'] === 'boolean') {
		filtered['show-view-as-markdown'] = settings['show-view-as-markdown'];
	}
	if (typeof settings['show-search'] === 'boolean') {
		filtered['show-search'] = settings['show-search'];
	}
	if (typeof settings['show-set-view'] === 'boolean') {
		filtered['show-set-view'] = settings['show-set-view'];
	}

	return {
		...DEFAULT_KANBAN_BOARD_SETTINGS,
		...filtered,
	};
}

export function getBoardSettingsOverrides(settings: KanbanBoardSettings): KanbanBoardSettings {
	const overrides: KanbanBoardSettings = {};

	if (settings['show-board-color'] === false) overrides['show-board-color'] = false;
	if (settings['show-add-list'] === false) overrides['show-add-list'] = false;
	if (settings['show-view-as-markdown'] === false) overrides['show-view-as-markdown'] = false;
	if (settings['show-search'] === false) overrides['show-search'] = false;
	if (settings['show-set-view'] === false) overrides['show-set-view'] = false;

	return overrides;
}

export function hasBoardSettingsOverrides(settings: KanbanBoardSettings): boolean {
	return Object.keys(getBoardSettingsOverrides(settings)).length > 0;
}

export function parseBoardSettingsFooter(markdown: string): KanbanBoardSettings {
	const settings = extractSettingsFooter(markdown);
	const { ['kanban-color']: _ignoredColor, ...withoutColor } = settings;
	return normalizeBoardSettings(withoutColor);
}

function extractSettingsFooter(markdown: string): Partial<KanbanBoardSettings> {
	const lines = markdown.split('\n');
	let endIndex = -1;

	for (let i = lines.length - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '%%') {
			endIndex = i;
			break;
		}
	}

	if (endIndex === -1) return {};

	let cursor = endIndex - 1;
	while (cursor >= 0 && lines[cursor]?.trim() === '') cursor -= 1;
	if (cursor < 0 || lines[cursor]?.trim() !== '```') return {};
	const closingFence = cursor;

	let openingFence = -1;
	for (let i = closingFence - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '```') {
			openingFence = i;
			break;
		}
	}
	if (openingFence === -1) return {};

	let sentinelIndex = openingFence - 1;
	while (sentinelIndex >= 0 && lines[sentinelIndex]?.trim() === '') sentinelIndex -= 1;
	if (sentinelIndex < 0 || lines[sentinelIndex]?.trim() !== '%% kanban:settings') return {};

	const jsonText = lines
		.slice(openingFence + 1, closingFence)
		.join('\n')
		.trim();
	if (!jsonText) return {};

	try {
		const parsed: unknown = JSON.parse(jsonText);
		if (!isRecord(parsed)) return {};
		return parsed as Partial<KanbanBoardSettings>;
	} catch {
		return {};
	}
}

export function serializeBoardSettingsFooter(settings: KanbanBoardSettings): string | null {
	const overrides = getBoardSettingsOverrides(settings);
	if (Object.keys(overrides).length === 0) return null;
	return ['', '', '%% kanban:settings', '```', JSON.stringify(overrides), '```', '%%'].join('\n');
}
