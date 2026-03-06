import { buildGanttYearView, collectGanttBoardSchedules } from '../../services/model-service.ts';
import { assert, test } from 'vitest';

type MockFile = {
	path: string;
	basename: string;
	parent: { path: string } | null;
	stat: { mtime: number };
};

const createFile = (path: string, mtime = 0): MockFile => {
	const segments = path.split('/');
	const fileName = segments[segments.length - 1] ?? '';
	const basename = fileName.replace(/\.md$/i, '');
	const parentPath = segments.slice(0, -1).join('/');
	return {
		path,
		basename,
		parent: parentPath ? { path: parentPath } : null,
		stat: { mtime },
	};
};

const boardMarkdown = [
	'---',
	'kanban-plugin: board',
	'kanban-color: "#224466"',
	'---',
	'',
	'## Doing',
	'',
	'- [ ] [[cards/alpha-card]]',
	'- [ ] [[cards/no-date-card]]',
	'',
	'## Done',
	'',
	'- [ ] [[cards/beta-card]]',
].join('\n');

const createMockApp = () => {
	const files = {
		'boards/alpha.md': createFile('boards/alpha.md', 500),
		'cards/alpha-card.md': createFile('cards/alpha-card.md'),
		'cards/no-date-card.md': createFile('cards/no-date-card.md'),
		'cards/beta-card.md': createFile('cards/beta-card.md'),
		'calendar/alpha-event.md': createFile('calendar/alpha-event.md'),
		'calendar/beta-event.md': createFile('calendar/beta-event.md'),
	};

	const frontmatterByPath: Record<string, Record<string, unknown>> = {
		'boards/alpha.md': {
			'kanban-plugin': 'board',
			'kanban-color': '#224466',
		},
		'cards/alpha-card.md': {
			timelinkEvent: '[[calendar/alpha-event.md]]',
		},
		'cards/no-date-card.md': {
			timelinkEvent: '[[calendar/missing-date.md]]',
		},
		'cards/beta-card.md': {
			timelinkEvent: '[[calendar/beta-event.md]]',
		},
		'calendar/alpha-event.md': {
			title: 'Alpha launch',
			date: '2026-01-15',
			endDate: '2026-02-10',
			allDay: true,
			color: '#AA5500',
		},
		'calendar/beta-event.md': {
			title: 'Beta carryover',
			date: '2025-12-28',
			endDate: '2026-01-03',
			allDay: true,
		},
	};

	const markdownByPath: Record<string, string> = {
		'boards/alpha.md': boardMarkdown,
	};

	const app = {
		vault: {
			getMarkdownFiles: () => [files['boards/alpha.md']],
			cachedRead: (file: MockFile) => Promise.resolve(markdownByPath[file.path] ?? ''),
			getAbstractFileByPath: (path: string) => files[path as keyof typeof files] ?? null,
		},
		metadataCache: {
			getFileCache: (file: MockFile) => ({ frontmatter: frontmatterByPath[file.path] }),
			getFirstLinkpathDest: (linkPath: string) => {
				const normalized = linkPath.replace(/^\//, '');
				return (
					files[normalized as keyof typeof files] ??
					files[`${normalized}.md` as keyof typeof files] ??
					null
				);
			},
		},
	};

	return app;
};

void test('collectGanttBoardSchedules groups linked dated events by kanban board and hides undated items', async () => {
	const app = createMockApp();

	const boards = await collectGanttBoardSchedules({
		app,
		calendarFolderPath: 'calendar',
		maxDepth: 5,
	});

	assert.strictEqual(boards.length, 1);
	assert.strictEqual(boards[0]?.path, 'boards/alpha.md');
	assert.strictEqual(boards[0]?.rows.length, 2);
	assert.deepEqual(
		boards[0]?.rows.map((row) => ({
			title: row.title,
			startKey: row.startKey,
			endKey: row.endKey,
			color: row.color,
		})),
		[
			{
				title: 'Beta carryover',
				startKey: '2025-12-28',
				endKey: '2026-01-03',
				color: '#224466',
			},
			{
				title: 'Alpha launch',
				startKey: '2026-01-15',
				endKey: '2026-02-10',
				color: '#AA5500',
			},
		],
	);
});

void test('buildGanttYearView clamps event ranges to selected year, drops empty boards, and exposes today index', () => {
	const yearView = buildGanttYearView(
		[
			{
				path: 'boards/alpha.md',
				basename: 'alpha',
				folderPath: 'boards',
				folderDepth: 1,
				mtime: 500,
				kanbanColor: '#224466',
				linkedCardPaths: [],
				linkedEventPaths: [],
				dependencyPaths: [],
				rows: [
					{
						id: 'beta',
						title: 'Beta carryover',
						boardPath: 'boards/alpha.md',
						sourceEventPath: 'calendar/beta-event.md',
						startKey: '2025-12-28',
						endKey: '2026-01-03',
						color: '#224466',
					},
					{
						id: 'alpha',
						title: 'Alpha launch',
						boardPath: 'boards/alpha.md',
						sourceEventPath: 'calendar/alpha-event.md',
						startKey: '2026-01-15',
						endKey: '2026-02-10',
						color: '#AA5500',
					},
				],
			},
			{
				path: 'boards/empty.md',
				basename: 'empty',
				folderPath: 'boards',
				folderDepth: 1,
				mtime: 100,
				kanbanColor: '#999999',
				linkedCardPaths: [],
				linkedEventPaths: [],
				dependencyPaths: [],
				rows: [
					{
						id: 'outside',
						title: 'Outside only',
						boardPath: 'boards/empty.md',
						sourceEventPath: 'calendar/outside.md',
						startKey: '2027-01-10',
						endKey: '2027-01-20',
						color: '#999999',
					},
				],
			},
		],
		2026,
		new Date('2026-02-03T09:00:00Z'),
	);

	assert.strictEqual(yearView.year, 2026);
	assert.strictEqual(yearView.totalDays, 365);
	assert.strictEqual(yearView.dayCells.length, 365);
	assert.strictEqual(yearView.todayDayIndex, 33);
	assert.deepEqual(
		yearView.dayCells.slice(0, 5).map((cell) => cell.label),
		['1', '2', '3', '4', '5'],
	);
	assert.strictEqual(yearView.dayCells[31]?.label, '1');
	assert.strictEqual(yearView.boardGroups.length, 1);
	assert.strictEqual(yearView.rows.length, 2);
	assert.strictEqual(yearView.rows[0]?.boardLabel?.basename, 'alpha');
	assert.strictEqual(yearView.rows[1]?.boardLabel, null);
	assert.deepEqual(
		yearView.rows.map((row) => ({
			title: row.title,
			startDayIndex: row.startDayIndex,
			spanDays: row.spanDays,
			startKey: row.startKey,
			endKey: row.endKey,
		})),
		[
			{
				title: 'Beta carryover',
				startDayIndex: 0,
				spanDays: 3,
				startKey: '2026-01-01',
				endKey: '2026-01-03',
			},
			{
				title: 'Alpha launch',
				startDayIndex: 14,
				spanDays: 27,
				startKey: '2026-01-15',
				endKey: '2026-02-10',
			},
		],
	);
	assert.deepEqual(
		yearView.months.map((month) => month.dayCount),
		[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
	);
});

void test('buildGanttYearView uses leap-year day counts', () => {
	const yearView = buildGanttYearView(
		[
			{
				path: 'boards/alpha.md',
				basename: 'alpha',
				folderPath: 'boards',
				folderDepth: 1,
				mtime: 500,
				kanbanColor: '#224466',
				linkedCardPaths: [],
				linkedEventPaths: [],
				dependencyPaths: [],
				rows: [
					{
						id: 'leap',
						title: 'Leap window',
						boardPath: 'boards/alpha.md',
						sourceEventPath: 'calendar/leap.md',
						startKey: '2028-02-28',
						endKey: '2028-03-01',
						color: '#224466',
					},
				],
			},
		],
		2028,
		new Date('2027-02-03T09:00:00Z'),
	);

	assert.strictEqual(yearView.totalDays, 366);
	assert.strictEqual(yearView.dayCells.length, 366);
	assert.strictEqual(yearView.todayDayIndex, null);
	assert.strictEqual(yearView.months[1]?.dayCount, 29);
	assert.strictEqual(yearView.rows[0]?.spanDays, 3);
});
