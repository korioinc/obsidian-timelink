import type { KanbanBoardSettings } from '../types';
import { normalizeBoardSettings } from './settings-service';

export function isVisibilitySettingEnabled(
	settings: KanbanBoardSettings | undefined,
	key: keyof KanbanBoardSettings,
): boolean {
	const normalized = settings ?? normalizeBoardSettings();
	return normalized[key] !== false;
}
