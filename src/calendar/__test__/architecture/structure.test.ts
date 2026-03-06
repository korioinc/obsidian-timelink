/* eslint-disable import/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const resolveProjectRoot = (): string => {
	const testFilePath = fileURLToPath(import.meta.url);
	return path.resolve(path.dirname(testFilePath), '../../../..');
};

void test('calendar model service centralizes event file resolution guards', () => {
	const projectRoot = resolveProjectRoot();
	const modelServicePath = path.join(projectRoot, 'src/calendar/services/model-service.ts');
	const source = readFileSync(modelServicePath, 'utf8');

	const inlineGuardCount = (source.match(/Note calendar cannot handle inline events\./g) ?? [])
		.length;
	const fileLookupCount = (source.match(/getAbstractFileByPath\(file\.path\)/g) ?? []).length;

	assert.match(
		source,
		/resolveEventFileOrThrow\(/,
		'calendar model service should expose a single file resolver helper',
	);
	assert.equal(inlineGuardCount, 1, 'inline-event guard should exist in one shared helper only');
	assert.equal(fileLookupCount, 1, 'vault file lookup by event location should be centralized');
});

void test('calendar view no longer keeps a no-op onResize override', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/calendar/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		source.includes('onResize(): void'),
		false,
		'remove no-op onResize override from calendar view',
	);
});

void test('calendar view delegates open/close flow to shared dated item view base', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/calendar/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		source.includes("from '../shared/view/dated-event-item-view'"),
		true,
		'calendar view should consume shared dated item view base class',
	);
	assert.equal(
		source.includes('extends DatedEventItemView<FullNoteCalendar>'),
		true,
		'calendar view should extend shared dated item view base',
	);
	assert.equal(
		source.includes('async onOpen(): Promise<void>'),
		false,
		'calendar view should not duplicate open lifecycle logic once base handles it',
	);
	assert.equal(
		source.includes('super(leaf, plugin);'),
		true,
		'calendar view constructor should pass plugin context to shared dated item view base',
	);
});

void test('calendar view does not keep unused calendar instance state', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/calendar/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		source.includes('private calendar:'),
		false,
		'calendar view should not keep an unused calendar field',
	);
	assert.equal(
		source.includes('this.calendar = calendar;'),
		false,
		'calendar view should not assign an unused calendar field on open',
	);
});

void test('week cell capacity hook does not expose unused container ref', () => {
	const projectRoot = resolveProjectRoot();
	const weekCellFilePath = path.join(projectRoot, 'src/calendar/_components/month/WeekCell.tsx');
	const source = readFileSync(weekCellFilePath, 'utf8');

	assert.equal(
		source.includes('containerElRef: { current: HTMLDivElement | null }'),
		false,
		'WeekCell useWeekCapacity return type should not expose unused containerElRef',
	);
	assert.equal(
		source.includes('\t\tcontainerElRef,'),
		false,
		'WeekCell useWeekCapacity should not return unused containerElRef field',
	);
});

void test('calendar and timeline timed grid models import timed entries builder from shared layer', () => {
	const projectRoot = resolveProjectRoot();
	const calendarGridPath = path.join(projectRoot, 'src/calendar/utils/day-week-grid.ts');
	const timelineModelPath = path.join(projectRoot, 'src/timeline/services/model-service.ts');
	const calendarSource = readFileSync(calendarGridPath, 'utf8');
	const timelineSource = readFileSync(timelineModelPath, 'utf8');
	const legacySpecifier = '../../utils/timed-events-grid';
	const sharedSpecifier = '../../shared/time-grid/timed-events-grid';

	assert.equal(
		calendarSource.includes(legacySpecifier),
		false,
		'calendar day-week grid should not import timed builder from src/utils',
	);
	assert.equal(
		timelineSource.includes(legacySpecifier),
		false,
		'timeline model service should not import timed builder from src/utils',
	);
	assert.equal(
		calendarSource.includes(sharedSpecifier),
		true,
		'calendar day-week grid should import timed builder from shared layer',
	);
	assert.equal(
		timelineSource.includes(sharedSpecifier),
		true,
		'timeline model service should import timed builder from shared layer',
	);
});

void test('legacy root timed-events-grid module is removed', () => {
	const projectRoot = resolveProjectRoot();
	const legacyTimedGridPath = path.join(projectRoot, 'src/utils/timed-events-grid.ts');
	assert.equal(
		existsSync(legacyTimedGridPath),
		false,
		'legacy src/utils/timed-events-grid.ts should be removed after shared-layer migration',
	);
});

void test('list calendar uses shared event interaction hook without calendar-only date-click adapter', () => {
	const projectRoot = resolveProjectRoot();
	const listCalendarPath = path.join(projectRoot, 'src/calendar/view/list-calendar.tsx');
	const calendarHandlersPath = path.join(
		projectRoot,
		'src/calendar/hooks/use-calendar-interaction-handlers.ts',
	);
	const listCalendarSource = readFileSync(listCalendarPath, 'utf8');
	const calendarHandlersSource = readFileSync(calendarHandlersPath, 'utf8');

	assert.equal(
		listCalendarSource.includes("from '../hooks/use-calendar-interaction-handlers'"),
		false,
		'list calendar should not depend on date-click specific calendar interaction adapter',
	);
	assert.equal(
		listCalendarSource.includes("from '../../shared/hooks/use-event-interaction-handlers'"),
		true,
		'list calendar should consume shared event interaction hook directly',
	);
	assert.equal(
		calendarHandlersSource.includes('as NonNullable<typeof handlers.handleDateClick>'),
		false,
		'calendar interaction adapter should not require type casting for date click handler',
	);
});

void test('all-day event content is reused between day-week bars and month more popover', () => {
	const projectRoot = resolveProjectRoot();
	const sharedContentPath = path.join(
		projectRoot,
		'src/calendar/_components/common/AllDayEventContent.tsx',
	);
	const allDayBarPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/AllDayEventBar.tsx',
	);
	const morePopoverPath = path.join(projectRoot, 'src/calendar/_components/month/MorePopover.tsx');
	const allDayBarSource = readFileSync(allDayBarPath, 'utf8');
	const morePopoverSource = readFileSync(morePopoverPath, 'utf8');

	assert.equal(
		existsSync(sharedContentPath),
		true,
		'calendar should keep shared all-day event content component for reusable title/time/checkbox UI',
	);
	assert.equal(
		allDayBarSource.includes("from '../common/AllDayEventContent'"),
		true,
		'day-week all-day bars should reuse shared all-day event content component',
	);
	assert.equal(
		morePopoverSource.includes("from '../common/AllDayEventContent'"),
		true,
		'month more popover should reuse shared all-day event content component',
	);
	assert.equal(
		allDayBarSource.includes("textDecorationLine: 'line-through'"),
		false,
		'line-through text style should live in shared all-day event content component only',
	);
	assert.equal(
		morePopoverSource.includes("textDecorationLine: 'line-through'"),
		false,
		'line-through text style should live in shared all-day event content component only',
	);
});

void test('week all-day section props reuse shared all-day interaction handler type', () => {
	const projectRoot = resolveProjectRoot();
	const calendarTypesPath = path.join(projectRoot, 'src/calendar/types.ts');
	const interactionTypesPath = path.join(projectRoot, 'src/calendar/all-day-interaction-types.ts');
	const calendarTypesSource = readFileSync(calendarTypesPath, 'utf8');
	const interactionTypesSource = readFileSync(interactionTypesPath, 'utf8');

	assert.equal(
		calendarTypesSource.includes("from './all-day-interaction-types'"),
		true,
		'calendar root types should reuse all-day interaction handler type from a neutral calendar module',
	);
	assert.equal(
		calendarTypesSource.includes('WeekAllDaySectionProps = AllDayEventInteractionHandlers & {'),
		true,
		'WeekAllDaySectionProps should compose the shared all-day interaction handler type',
	);
	assert.equal(
		interactionTypesSource.includes("from '../shared/event/types'"),
		true,
		'all-day interaction type module should depend on shared event types, not calendar root types',
	);
});

void test('calendar model service delegates card backlink sync to dedicated service layer', () => {
	const projectRoot = resolveProjectRoot();
	const modelServicePath = path.join(projectRoot, 'src/calendar/services/model-service.ts');
	const backlinkServicePath = path.join(
		projectRoot,
		'src/calendar/services/event-card-backlink-service.ts',
	);
	const source = readFileSync(modelServicePath, 'utf8');

	assert.equal(
		existsSync(backlinkServicePath),
		true,
		'calendar should keep dedicated event-card-backlink service for card frontmatter sync',
	);
	assert.equal(
		source.includes("from '../../shared/frontmatter/timelink-frontmatter'"),
		false,
		'calendar model service should not depend on timelink frontmatter key directly',
	);
	assert.equal(
		source.includes("from './linked-card-service'"),
		false,
		'calendar model service should not resolve linked card file directly',
	);
	assert.equal(
		source.includes('clearLinkedCardEventBacklink('),
		true,
		'calendar model service should delegate event-delete backlink cleanup',
	);
	assert.equal(
		source.includes('syncLinkedCardEventBacklink('),
		true,
		'calendar model service should delegate event-save backlink sync',
	);
});

void test('calendar layer does not depend on main plugin type imports', () => {
	const projectRoot = resolveProjectRoot();
	const modelServicePath = path.join(projectRoot, 'src/calendar/services/model-service.ts');
	const viewPath = path.join(projectRoot, 'src/calendar/view.tsx');
	const modelServiceSource = readFileSync(modelServicePath, 'utf8');
	const viewSource = readFileSync(viewPath, 'utf8');

	assert.equal(
		modelServiceSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'calendar model service should use narrow local plugin context instead of main plugin type',
	);
	assert.equal(
		viewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'calendar view should use narrow local plugin context instead of main plugin type',
	);
});

void test('month and day-week controllers reuse shared calendar interaction state hook', () => {
	const projectRoot = resolveProjectRoot();
	const monthControllerPath = path.join(
		projectRoot,
		'src/calendar/hooks/use-month-calendar-controller.ts',
	);
	const dayWeekControllerPath = path.join(
		projectRoot,
		'src/calendar/hooks/use-day-week-controller.ts',
	);
	const monthControllerSource = readFileSync(monthControllerPath, 'utf8');
	const dayWeekControllerSource = readFileSync(dayWeekControllerPath, 'utf8');

	assert.equal(
		monthControllerSource.includes('useCalendarModalState()'),
		true,
		'month controller should consume shared calendar modal state hook',
	);
	assert.equal(
		dayWeekControllerSource.includes('useCalendarModalState()'),
		true,
		'day/week controller should consume shared calendar modal state hook',
	);
	assert.equal(
		monthControllerSource.includes('useCalendarMoreMenuState()'),
		true,
		'month controller should keep dedicated more-menu state for month-only UI',
	);
	assert.equal(
		dayWeekControllerSource.includes('useCalendarMoreMenuState()'),
		false,
		'day/week controller should not keep month-only more-menu state',
	);
	assert.equal(
		monthControllerSource.includes('useCalendarControllerInteractionHandlers({'),
		false,
		'month controller should not keep a pass-through controller interaction wrapper',
	);
	assert.equal(
		dayWeekControllerSource.includes('useCalendarControllerInteractionHandlers({'),
		false,
		'day/week controller should not keep a pass-through controller interaction wrapper',
	);
	assert.equal(
		monthControllerSource.includes('useCalendarInteractionHandlers({'),
		true,
		'month controller should call the shared interaction hook directly',
	);
	assert.equal(
		dayWeekControllerSource.includes('useCalendarInteractionHandlers({'),
		true,
		'day/week controller should call the shared interaction hook directly',
	);
});

void test('calendar day and week timed grids reuse local preset helpers', () => {
	const projectRoot = resolveProjectRoot();
	const presetPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/timed-grid-preset.tsx',
	);
	const dayTimeGridPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/DayTimeGrid.tsx',
	);
	const weekTimeGridPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/WeekTimeGrid.tsx',
	);
	const dayTimeGridSource = readFileSync(dayTimeGridPath, 'utf8');
	const weekTimeGridSource = readFileSync(weekTimeGridPath, 'utf8');

	assert.equal(
		existsSync(presetPath),
		true,
		'calendar day/week timed grid should share a local preset helper module',
	);
	assert.equal(
		dayTimeGridSource.includes("from './timed-grid-preset'"),
		true,
		'calendar day grid should import timed-grid preset helpers',
	);
	assert.equal(
		weekTimeGridSource.includes("from './timed-grid-preset'"),
		true,
		'calendar week grid should import timed-grid preset helpers',
	);
	assert.equal(
		dayTimeGridSource.includes('Array.from({ length: 24 })'),
		false,
		'calendar day grid should not inline hour-axis rendering once preset helpers exist',
	);
	assert.equal(
		weekTimeGridSource.includes('Array.from({ length: 24 })'),
		false,
		'calendar week grid should not inline hour-axis rendering once preset helpers exist',
	);
});
