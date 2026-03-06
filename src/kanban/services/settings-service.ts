import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import { BOARD_VISIBILITY_SETTINGS } from '../constants';
import type { BoardVisibilitySettingKey, KanbanBoardSettings } from '../types';
import { extractSettingsFooterJson } from '../utils/settings-footer';

const DEFAULT_VISIBILITY_SETTINGS: Record<BoardVisibilitySettingKey, boolean> =
	BOARD_VISIBILITY_SETTINGS.reduce<Record<BoardVisibilitySettingKey, boolean>>(
		(acc, setting) => {
			acc[setting.key] = setting.defaultValue;
			return acc;
		},
		{} as Record<BoardVisibilitySettingKey, boolean>,
	);

const DEFAULT_KANBAN_BOARD_SETTINGS: Record<BoardVisibilitySettingKey, boolean> &
	Pick<KanbanBoardSettings, typeof KANBAN_BOARD_COLOR_KEY> = {
	...DEFAULT_VISIBILITY_SETTINGS,
	[KANBAN_BOARD_COLOR_KEY]: undefined,
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

	if (typeof settings[KANBAN_BOARD_COLOR_KEY] === 'string') {
		filtered[KANBAN_BOARD_COLOR_KEY] = settings[KANBAN_BOARD_COLOR_KEY];
	}
	BOARD_VISIBILITY_SETTINGS.forEach((visibilitySetting) => {
		const key = visibilitySetting.key;
		const value = settings[key];
		if (typeof value === 'boolean') {
			filtered[key] = value;
		}
	});

	return {
		...DEFAULT_KANBAN_BOARD_SETTINGS,
		...filtered,
	};
}

export function getBoardSettingsOverrides(settings: KanbanBoardSettings): KanbanBoardSettings {
	const overrides: KanbanBoardSettings = {};
	BOARD_VISIBILITY_SETTINGS.forEach((visibilitySetting) => {
		const key = visibilitySetting.key;
		const value = settings[key];
		if (typeof value === 'boolean' && value !== visibilitySetting.defaultValue) {
			overrides[key] = value;
		}
	});

	return overrides;
}

export function parseBoardSettingsFooter(markdown: string): KanbanBoardSettings {
	const settings = extractSettingsFooter(markdown);
	const withoutColor: Partial<KanbanBoardSettings> = { ...settings };
	delete withoutColor[KANBAN_BOARD_COLOR_KEY];
	return normalizeBoardSettings(withoutColor);
}

function extractSettingsFooter(markdown: string): Partial<KanbanBoardSettings> {
	const jsonText = extractSettingsFooterJson(markdown);
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
