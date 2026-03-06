import mainSource from '../../../main.ts?raw';
import mountedItemViewSource from '../../../shared/view/mounted-item-view.ts?raw';
import ganttHeaderSource from '../../_components/GanttHeader.tsx?raw';
import ganttGridSource from '../../_components/GanttYearGrid.tsx?raw';
import ganttModelServiceSource from '../../services/model-service.ts?raw';
import ganttTypesSource from '../../types.ts?raw';
import ganttViewSource from '../../view.tsx?raw';
import ganttItemViewSource from '../../view/index.ts?raw';
import { assert, test } from 'vitest';

void test('gantt item view reuses shared mounted item view base', () => {
	assert.strictEqual(mountedItemViewSource.length > 0, true);
	assert.strictEqual(
		ganttItemViewSource.includes("from '../../shared/view/mounted-item-view'"),
		true,
		'gantt item view should reuse the shared mounted item view base',
	);
	assert.strictEqual(
		ganttItemViewSource.includes('extends MountedItemView'),
		true,
		'gantt item view should extend the shared mounted item view base',
	);
});

void test('gantt reuses shared kanban and event helpers instead of duplicating parsing logic', () => {
	assert.strictEqual(
		ganttModelServiceSource.includes("from '../../kanban-list/services/model-service'"),
		true,
		'gantt should reuse kanban-list board discovery',
	);
	assert.strictEqual(
		ganttModelServiceSource.includes("from '../../kanban/services/card-service'"),
		true,
		'gantt should reuse kanban linked-event discovery',
	);
	assert.strictEqual(
		ganttModelServiceSource.includes("from '../../shared/event/date-range'"),
		true,
		'gantt should reuse shared event date-range normalization',
	);
	assert.strictEqual(
		ganttModelServiceSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'gantt service should not depend on main plugin type imports',
	);
});

void test('gantt grid renders day-number header and board open action without file path text', () => {
	assert.strictEqual(
		ganttGridSource.includes('view.dayCells.map'),
		true,
		'gantt grid should render day-number cells under month headers',
	);
	assert.strictEqual(
		ganttGridSource.includes('onOpenBoard(board.path)'),
		true,
		'gantt grid should open the linked kanban board when board label is clicked',
	);
	assert.strictEqual(
		ganttGridSource.includes('{board.path}'),
		false,
		'gantt left pane should not render the raw board file path text',
	);
	assert.strictEqual(
		ganttTypesSource.includes('openKanbanBoard: (boardPath: string) => Promise<void>;'),
		true,
		'gantt plugin context should expose a narrow board-open callback',
	);
});

void test('gantt root wraps board-open callback and wires today-button scroll requests', () => {
	assert.strictEqual(
		ganttViewSource.includes('onOpenBoard={(boardPath) => void plugin.openKanbanBoard(boardPath)}'),
		true,
		'gantt root should preserve plugin method binding when wiring board-open callback',
	);
	assert.strictEqual(
		ganttViewSource.includes('setScrollToTodayRequestKey((current) => current + 1)'),
		true,
		'gantt root should bump a scroll request key when Today is clicked',
	);
	assert.strictEqual(
		ganttViewSource.includes('scrollToTodayRequestKey={scrollToTodayRequestKey}'),
		true,
		'gantt root should pass the today-scroll trigger to the grid',
	);
	assert.strictEqual(
		ganttViewSource.includes('onOpenBoard={plugin.openKanbanBoard}'),
		false,
		'gantt root should not pass an unbound class method directly to the grid',
	);
	assert.strictEqual(
		ganttGridSource.includes('view.todayDayIndex !== null'),
		true,
		'gantt grid should render a today-column highlight only when current year is visible',
	);
	assert.strictEqual(
		ganttTypesSource.includes('todayDayIndex: number | null;'),
		true,
		'gantt year view should expose the current-day column index',
	);
	assert.strictEqual(
		ganttGridSource.includes('title={row.title}'),
		false,
		'gantt event bars should not rely on delayed native title tooltips',
	);
	assert.strictEqual(
		ganttGridSource.includes('group-hover:opacity-100'),
		true,
		'gantt event bars should render an immediate custom hover tooltip',
	);
	assert.strictEqual(
		ganttGridSource.includes('border-[color:rgba(255,255,255,0.22)]'),
		true,
		'gantt hover tooltip should use a brighter border for contrast',
	);
	assert.strictEqual(
		ganttGridSource.includes('text-white'),
		true,
		'gantt hover tooltip should use higher-contrast text',
	);
	assert.strictEqual(
		ganttGridSource.includes('scrollContainerRef'),
		true,
		'gantt grid should keep a scroll container ref for auto and today-triggered positioning',
	);
	assert.strictEqual(
		ganttGridSource.includes('resolveInitialGanttScrollLeft'),
		true,
		'gantt grid should use a dedicated helper to place today near the left-center',
	);
	assert.strictEqual(
		ganttGridSource.includes('scrollToTodayRequestKey'),
		true,
		'gantt grid should react to an explicit today-scroll request key',
	);
	assert.strictEqual(
		ganttGridSource.includes('lastAutoScrolledYearRef'),
		true,
		'gantt grid should also auto-scroll once when the current year first opens',
	);
});

void test('gantt header uses icon prev/next buttons and keeps year control order', () => {
	assert.strictEqual(
		ganttHeaderSource.includes('>Prev year<'),
		false,
		'gantt header should not render Prev year text button',
	);
	assert.strictEqual(
		ganttHeaderSource.includes('>Next year<'),
		false,
		'gantt header should not render Next year text button',
	);
	assert.strictEqual(
		ganttHeaderSource.includes('aria-label="Previous year"'),
		true,
		'gantt header should expose an accessible previous-year icon button',
	);
	assert.strictEqual(
		ganttHeaderSource.includes('aria-label="Next year"'),
		true,
		'gantt header should expose an accessible next-year icon button',
	);

	const prevIndex = ganttHeaderSource.indexOf('onClick={onPrevYear}');
	const nextIndex = ganttHeaderSource.indexOf('onClick={onNextYear}');
	const todayIndex = ganttHeaderSource.indexOf('onClick={onCurrentYear}');
	const yearIndex = ganttHeaderSource.indexOf('{year}');

	assert.strictEqual(prevIndex !== -1, true, 'previous-year button should exist');
	assert.strictEqual(nextIndex !== -1, true, 'next-year button should exist');
	assert.strictEqual(todayIndex !== -1, true, 'today button should exist');
	assert.strictEqual(yearIndex !== -1, true, 'year label should exist');
	assert.strictEqual(
		prevIndex < nextIndex,
		true,
		'previous-year button should come before next-year',
	);
	assert.strictEqual(nextIndex < todayIndex, true, 'next-year button should come before today');
	assert.strictEqual(todayIndex < yearIndex, true, 'today button should come before year label');
});

void test('main registers gantt view and ribbon icon alongside existing workspace views', () => {
	assert.strictEqual(
		mainSource.includes('GANTT_VIEW_TYPE'),
		true,
		'main should reference the gantt view type',
	);
	assert.strictEqual(
		mainSource.includes('new TimeLinkGanttView(leaf, this)'),
		true,
		'main should register the gantt item view',
	);
	assert.strictEqual(
		mainSource.includes('private ganttRibbonIcon: HTMLElement | null = null;'),
		true,
		'main should track gantt ribbon element for enable/disable sync',
	);
	assert.strictEqual(
		mainSource.includes('ensureGanttRibbonIcon'),
		true,
		'main should manage gantt ribbon icon lifecycle',
	);
	assert.strictEqual(
		mainSource.includes('this.ensureGanttRibbonIcon();'),
		true,
		'main should attach gantt ribbon through kanban sync lifecycle',
	);
	assert.strictEqual(
		mainSource.includes('this.removeGanttRibbonIcon();'),
		true,
		'main should remove gantt ribbon through kanban sync lifecycle',
	);
	assert.strictEqual(
		mainSource.includes('openGanttView'),
		true,
		'main should expose a workspace opener for gantt view',
	);
	assert.strictEqual(
		mainSource.includes('openKanbanBoard(boardPath: string)'),
		true,
		'main should expose a board opener for gantt interactions',
	);
});
