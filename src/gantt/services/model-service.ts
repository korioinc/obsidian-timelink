import { KANBAN_LIST_MAX_DEPTH } from '../../kanban-list/constants';
import { collectKanbanBoards } from '../../kanban-list/services/model-service';
import { collectLinkedEventFiles, resolveLinkedCardFile } from '../../kanban/services/card-service';
import { parseKanbanBoard } from '../../kanban/services/parser-service';
import { resolveNormalizedEventDateRange } from '../../shared/event/date-range';
import {
	compareDateKey,
	DEFAULT_EVENT_COLOR,
	diffInDays,
	formatDateKey,
	normalizeEventColor,
	parseDateKey,
} from '../../shared/event/model-utils';
import { toEventFromFrontmatter } from '../../shared/event/note-calendar-utils';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import type {
	GanttBoardSchedule,
	GanttDayCell,
	GanttDisplayRow,
	GanttMonthCell,
	GanttScheduleRow,
	GanttYearView,
} from '../types';
import type { TFile } from 'obsidian';

type CollectGanttBoardSchedulesParams = {
	app: {
		vault: {
			getAbstractFileByPath: (path: string) => unknown;
			cachedRead: (file: TFile) => Promise<string>;
		};
		metadataCache: {
			getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null | undefined;
		};
	};
	calendarFolderPath: string;
	maxDepth?: number;
};

type FileLike = TFile & { path: string; basename: string };

const isFileLike = (file: unknown): file is FileLike => {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	const basename = (file as { basename?: unknown }).basename;
	return typeof path === 'string' && typeof basename === 'string';
};

const compareRows = (left: GanttScheduleRow, right: GanttScheduleRow): number => {
	const startCompare = compareDateKey(left.startKey, right.startKey);
	if (startCompare !== 0) return startCompare;
	return left.title.localeCompare(right.title);
};

const isPathInDirectory = (path: string, directory: string): boolean =>
	path === directory || path.startsWith(`${directory}/`);

const buildYearBoundaryDateKey = (year: number, month: number, day: number): string =>
	`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const clampDateKey = (value: string, min: string, max: string): string => {
	if (compareDateKey(value, min) < 0) return min;
	if (compareDateKey(value, max) > 0) return max;
	return value;
};

const buildMonthCells = (year: number): GanttMonthCell[] => {
	const formatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
	let offset = 0;
	return Array.from({ length: 12 }, (_, monthIndex) => {
		const firstDay = new Date(year, monthIndex, 1);
		const dayCount = new Date(year, monthIndex + 1, 0).getDate();
		const cell: GanttMonthCell = {
			key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
			label: formatter.format(firstDay),
			dayCount,
			startDayIndex: offset,
		};
		offset += dayCount;
		return cell;
	});
};

const buildDayCells = (months: GanttMonthCell[]): GanttDayCell[] =>
	months.flatMap((month) =>
		Array.from({ length: month.dayCount }, (_, dayIndex) => ({
			key: `${month.key}-${String(dayIndex + 1).padStart(2, '0')}`,
			label: `${dayIndex + 1}`,
		})),
	);

export const collectGanttBoardSchedules = async ({
	app,
	calendarFolderPath,
	maxDepth = KANBAN_LIST_MAX_DEPTH,
}: CollectGanttBoardSchedulesParams): Promise<GanttBoardSchedule[]> => {
	const boards = await collectKanbanBoards(app as never, maxDepth);
	const results: GanttBoardSchedule[] = [];

	for (const boardItem of boards) {
		const boardFile = app.vault.getAbstractFileByPath(boardItem.path);
		if (!isFileLike(boardFile)) continue;
		const markdown = await app.vault.cachedRead(boardFile);
		const board = parseKanbanBoard(markdown);
		const linkedCardPaths = new Set<string>();
		for (const lane of board.lanes) {
			for (const card of lane.cards) {
				const linkedCardFile = resolveLinkedCardFile(app as never, boardFile.path, card.title);
				if (linkedCardFile) {
					linkedCardPaths.add(linkedCardFile.path);
				}
			}
		}

		const linkedEventFiles = collectLinkedEventFiles(
			app as never,
			board,
			boardFile.path,
			TIMELINK_EVENT_KEY,
		);
		const linkedEventPaths = Array.from(linkedEventFiles)
			.map((file) => file.path)
			.filter((path) => isPathInDirectory(path, calendarFolderPath));
		const rows: GanttScheduleRow[] = [];

		for (const eventFile of linkedEventFiles) {
			if (!isPathInDirectory(eventFile.path, calendarFolderPath)) continue;
			const frontmatter = app.metadataCache.getFileCache(eventFile)?.frontmatter;
			if (!frontmatter) continue;
			const event = toEventFromFrontmatter(frontmatter, eventFile.basename);
			const range = resolveNormalizedEventDateRange(event);
			if (!range) continue;
			rows.push({
				id: `${boardFile.path}:${eventFile.path}`,
				title: event.title,
				boardPath: boardFile.path,
				sourceEventPath: eventFile.path,
				startKey: range.startKey,
				endKey: range.endKey,
				color: normalizeEventColor(event.color) ?? boardItem.kanbanColor ?? DEFAULT_EVENT_COLOR,
			});
		}

		results.push({
			...boardItem,
			rows: rows.sort(compareRows),
			linkedCardPaths: Array.from(linkedCardPaths).sort(),
			linkedEventPaths: linkedEventPaths.sort(),
			dependencyPaths: [boardItem.path, ...Array.from(linkedCardPaths), ...linkedEventPaths].sort(),
		});
	}

	return results;
};

export const buildGanttYearView = (
	boards: GanttBoardSchedule[],
	year: number,
	todayDate = new Date(),
): GanttYearView => {
	const yearStartKey = buildYearBoundaryDateKey(year, 1, 1);
	const yearEndKey = buildYearBoundaryDateKey(year, 12, 31);
	const yearStartDate = parseDateKey(yearStartKey);
	const months = buildMonthCells(year);
	const todayKey = formatDateKey(todayDate);
	const todayDayIndex =
		todayDate.getFullYear() === year ? diffInDays(yearStartDate, parseDateKey(todayKey)) : null;
	const boardGroups = boards
		.map((board) => {
			const rows = board.rows
				.filter((row) => compareDateKey(row.endKey, yearStartKey) >= 0)
				.filter((row) => compareDateKey(row.startKey, yearEndKey) <= 0)
				.map((row) => {
					const startKey = clampDateKey(row.startKey, yearStartKey, yearEndKey);
					const endKey = clampDateKey(row.endKey, yearStartKey, yearEndKey);
					const spanDays = diffInDays(parseDateKey(startKey), parseDateKey(endKey)) + 1;
					return {
						...row,
						startKey,
						endKey,
						startDayIndex: diffInDays(yearStartDate, parseDateKey(startKey)),
						spanDays,
					};
				});

			return {
				path: board.path,
				basename: board.basename,
				folderPath: board.folderPath,
				folderDepth: board.folderDepth,
				mtime: board.mtime,
				kanbanColor: board.kanbanColor,
				rows,
			};
		})
		.filter((board) => board.rows.length > 0);
	const rows: GanttDisplayRow[] = boardGroups.flatMap((board) =>
		board.rows.map((row, index) => ({
			...row,
			boardLabel:
				index === 0
					? {
							path: board.path,
							basename: board.basename,
							kanbanColor: board.kanbanColor,
						}
					: null,
		})),
	);

	return {
		year,
		totalDays: diffInDays(parseDateKey(yearStartKey), parseDateKey(yearEndKey)) + 1,
		months,
		dayCells: buildDayCells(months),
		todayDayIndex,
		boardGroups,
		rows,
	};
};
