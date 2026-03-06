import timelineModelServiceSource from '../../../timeline/services/model-service.ts?raw';
import allDayBarSource from '../../_components/day-week/AllDayEventBar.tsx?raw';
import dayTimeGridSource from '../../_components/day-week/DayTimeGrid.tsx?raw';
import weekTimeGridSource from '../../_components/day-week/WeekTimeGrid.tsx?raw';
import morePopoverSource from '../../_components/month/MorePopover.tsx?raw';
import weekCellSource from '../../_components/month/WeekCell.tsx?raw';
import interactionTypesSource from '../../all-day-interaction-types.ts?raw';
import calendarHandlersSource from '../../hooks/use-calendar-interaction-handlers.ts?raw';
import dayWeekControllerSource from '../../hooks/use-day-week-controller.ts?raw';
import monthControllerSource from '../../hooks/use-month-calendar-controller.ts?raw';
import eventCardBacklinkServiceSource from '../../services/event-card-backlink-service.ts?raw';
import calendarModelServiceSource from '../../services/model-service.ts?raw';
import calendarTypesSource from '../../types.ts?raw';
import calendarGridSource from '../../utils/day-week-grid.ts?raw';
import calendarViewSource from '../../view.tsx?raw';
import listCalendarSource from '../../view/list-calendar.tsx?raw';
import { assert, test } from 'vitest';

const legacyTimedGridModules = import.meta.glob('../../../utils/timed-events-grid.ts');
const sharedAllDayContentModules = import.meta.glob(
	'../../_components/common/AllDayEventContent.tsx',
);
const backlinkServiceModules = import.meta.glob('../../services/event-card-backlink-service.ts');
const timedGridPresetModules = import.meta.glob('../../_components/day-week/timed-grid-preset.tsx');

void test('calendar model service centralizes event file resolution guards', () => {
	const inlineGuardCount = (
		calendarModelServiceSource.match(/Note calendar cannot handle inline events\./g) ?? []
	).length;
	const fileLookupCount = (
		calendarModelServiceSource.match(/getAbstractFileByPath\(file\.path\)/g) ?? []
	).length;

	assert.match(
		calendarModelServiceSource,
		/resolveEventFileOrThrow\(/,
		'calendar model service should expose a single file resolver helper',
	);
	assert.strictEqual(
		inlineGuardCount,
		1,
		'inline-event guard should exist in one shared helper only',
	);
	assert.strictEqual(
		fileLookupCount,
		1,
		'vault file lookup by event location should be centralized',
	);
});

void test('calendar view no longer keeps a no-op onResize override', () => {
	assert.strictEqual(
		calendarViewSource.includes('onResize(): void'),
		false,
		'remove no-op onResize override from calendar view',
	);
});

void test('calendar view delegates open/close flow to shared dated item view base', () => {
	assert.strictEqual(
		calendarViewSource.includes("from '../shared/view/dated-event-item-view'"),
		true,
		'calendar view should consume shared dated item view base class',
	);
	assert.strictEqual(
		calendarViewSource.includes('extends DatedEventItemView<FullNoteCalendar>'),
		true,
		'calendar view should extend shared dated item view base',
	);
	assert.strictEqual(
		calendarViewSource.includes('async onOpen(): Promise<void>'),
		false,
		'calendar view should not duplicate open lifecycle logic once base handles it',
	);
	assert.strictEqual(
		calendarViewSource.includes('super(leaf, plugin);'),
		true,
		'calendar view constructor should pass plugin context to shared dated item view base',
	);
});

void test('calendar view does not keep unused calendar instance state', () => {
	assert.strictEqual(
		calendarViewSource.includes('private calendar:'),
		false,
		'calendar view should not keep an unused calendar field',
	);
	assert.strictEqual(
		calendarViewSource.includes('this.calendar = calendar;'),
		false,
		'calendar view should not assign an unused calendar field on open',
	);
});

void test('week cell capacity hook does not expose unused container ref', () => {
	assert.strictEqual(
		weekCellSource.includes('containerElRef: { current: HTMLDivElement | null }'),
		false,
		'WeekCell useWeekCapacity return type should not expose unused containerElRef',
	);
	assert.strictEqual(
		weekCellSource.includes('\t\tcontainerElRef,'),
		false,
		'WeekCell useWeekCapacity should not return unused containerElRef field',
	);
});

void test('calendar and timeline timed grid models import timed entries builder from shared layer', () => {
	const legacySpecifier = '../../utils/timed-events-grid';
	const sharedSpecifier = '../../shared/time-grid/timed-events-grid';

	assert.strictEqual(
		calendarGridSource.includes(legacySpecifier),
		false,
		'calendar day-week grid should not import timed builder from src/utils',
	);
	assert.strictEqual(
		timelineModelServiceSource.includes(legacySpecifier),
		false,
		'timeline model service should not import timed builder from src/utils',
	);
	assert.strictEqual(
		calendarGridSource.includes(sharedSpecifier),
		true,
		'calendar day-week grid should import timed builder from shared layer',
	);
	assert.strictEqual(
		timelineModelServiceSource.includes(sharedSpecifier),
		true,
		'timeline model service should import timed builder from shared layer',
	);
});

void test('legacy root timed-events-grid module is removed', () => {
	assert.strictEqual(
		Object.keys(legacyTimedGridModules).length,
		0,
		'legacy src/utils/timed-events-grid.ts should be removed after shared-layer migration',
	);
});

void test('list calendar uses shared event interaction hook without calendar-only date-click adapter', () => {
	assert.strictEqual(
		listCalendarSource.includes("from '../hooks/use-calendar-interaction-handlers'"),
		false,
		'list calendar should not depend on date-click specific calendar interaction adapter',
	);
	assert.strictEqual(
		listCalendarSource.includes("from '../../shared/hooks/use-event-interaction-handlers'"),
		true,
		'list calendar should consume shared event interaction hook directly',
	);
	assert.strictEqual(
		calendarHandlersSource.includes('as NonNullable<typeof handlers.handleDateClick>'),
		false,
		'calendar interaction adapter should not require type casting for date click handler',
	);
});

void test('all-day event content is reused between day-week bars and month more popover', () => {
	assert.strictEqual(
		Object.keys(sharedAllDayContentModules).length > 0,
		true,
		'calendar should keep shared all-day event content component for reusable title/time/checkbox UI',
	);
	assert.strictEqual(
		allDayBarSource.includes("from '../common/AllDayEventContent'"),
		true,
		'day-week all-day bars should reuse shared all-day event content component',
	);
	assert.strictEqual(
		morePopoverSource.includes("from '../common/AllDayEventContent'"),
		true,
		'month more popover should reuse shared all-day event content component',
	);
	assert.strictEqual(
		allDayBarSource.includes("textDecorationLine: 'line-through'"),
		false,
		'line-through text style should live in shared all-day event content component only',
	);
	assert.strictEqual(
		morePopoverSource.includes("textDecorationLine: 'line-through'"),
		false,
		'line-through text style should live in shared all-day event content component only',
	);
});

void test('week all-day section props reuse shared all-day interaction handler type', () => {
	assert.strictEqual(
		calendarTypesSource.includes("from './all-day-interaction-types'"),
		true,
		'calendar root types should reuse all-day interaction handler type from a neutral calendar module',
	);
	assert.strictEqual(
		calendarTypesSource.includes('WeekAllDaySectionProps = AllDayEventInteractionHandlers & {'),
		true,
		'WeekAllDaySectionProps should compose the shared all-day interaction handler type',
	);
	assert.strictEqual(
		interactionTypesSource.includes("from '../shared/event/types'"),
		true,
		'all-day interaction type module should depend on shared event types, not calendar root types',
	);
});

void test('calendar model service delegates card backlink sync to dedicated service layer', () => {
	assert.strictEqual(
		Object.keys(backlinkServiceModules).length > 0 && eventCardBacklinkServiceSource.length > 0,
		true,
		'calendar should keep dedicated event-card-backlink service for card frontmatter sync',
	);
	assert.strictEqual(
		calendarModelServiceSource.includes("from '../../shared/frontmatter/timelink-frontmatter'"),
		false,
		'calendar model service should not depend on timelink frontmatter key directly',
	);
	assert.strictEqual(
		calendarModelServiceSource.includes("from './linked-card-service'"),
		false,
		'calendar model service should not resolve linked card file directly',
	);
	assert.strictEqual(
		calendarModelServiceSource.includes('clearLinkedCardEventBacklink('),
		true,
		'calendar model service should delegate event-delete backlink cleanup',
	);
	assert.strictEqual(
		calendarModelServiceSource.includes('syncLinkedCardEventBacklink('),
		true,
		'calendar model service should delegate event-save backlink sync',
	);
});

void test('calendar layer does not depend on main plugin type imports', () => {
	assert.strictEqual(
		calendarModelServiceSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'calendar model service should use narrow local plugin context instead of main plugin type',
	);
	assert.strictEqual(
		calendarViewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'calendar view should use narrow local plugin context instead of main plugin type',
	);
});

void test('month and day-week controllers reuse shared calendar interaction state hook', () => {
	assert.strictEqual(
		monthControllerSource.includes('useCalendarModalState()'),
		true,
		'month controller should consume shared calendar modal state hook',
	);
	assert.strictEqual(
		dayWeekControllerSource.includes('useCalendarModalState()'),
		true,
		'day/week controller should consume shared calendar modal state hook',
	);
	assert.strictEqual(
		monthControllerSource.includes('useCalendarMoreMenuState()'),
		true,
		'month controller should keep dedicated more-menu state for month-only UI',
	);
	assert.strictEqual(
		dayWeekControllerSource.includes('useCalendarMoreMenuState()'),
		false,
		'day/week controller should not keep month-only more-menu state',
	);
	assert.strictEqual(
		monthControllerSource.includes('useCalendarControllerInteractionHandlers({'),
		false,
		'month controller should not keep a pass-through controller interaction wrapper',
	);
	assert.strictEqual(
		dayWeekControllerSource.includes('useCalendarControllerInteractionHandlers({'),
		false,
		'day/week controller should not keep a pass-through controller interaction wrapper',
	);
	assert.strictEqual(
		monthControllerSource.includes('useCalendarInteractionHandlers({'),
		true,
		'month controller should call the shared interaction hook directly',
	);
	assert.strictEqual(
		dayWeekControllerSource.includes('useCalendarInteractionHandlers({'),
		true,
		'day/week controller should call the shared interaction hook directly',
	);
});

void test('calendar day and week timed grids reuse local preset helpers', () => {
	assert.strictEqual(
		Object.keys(timedGridPresetModules).length > 0,
		true,
		'calendar day/week timed grid should share a local preset helper module',
	);
	assert.strictEqual(
		dayTimeGridSource.includes("from './timed-grid-preset'"),
		true,
		'calendar day grid should import timed-grid preset helpers',
	);
	assert.strictEqual(
		weekTimeGridSource.includes("from './timed-grid-preset'"),
		true,
		'calendar week grid should import timed-grid preset helpers',
	);
	assert.strictEqual(
		dayTimeGridSource.includes('Array.from({ length: 24 })'),
		false,
		'calendar day grid should not inline hour-axis rendering once preset helpers exist',
	);
	assert.strictEqual(
		weekTimeGridSource.includes('Array.from({ length: 24 })'),
		false,
		'calendar week grid should not inline hour-axis rendering once preset helpers exist',
	);
});
