import timelineTimedInteractionsSource from '../../hooks/use-timeline-timed-interactions.ts?raw';
import timelineModelServiceSource from '../../services/model-service.ts?raw';
import timelineTypesSource from '../../types.ts?raw';
import timelineViewSource from '../../view.tsx?raw';
import timelineDayViewSource from '../../view/timeline-day-view.tsx?raw';
import { assert, test } from 'vitest';

const legacyTimeGridInteractionModules = import.meta.glob('../../utils/time-grid-interactions.ts');

void test('timeline day view consumes date from root without local date sync hook', () => {
	assert.strictEqual(
		timelineDayViewSource.includes("from '../../shared/hooks/use-date-sync'"),
		false,
		'TimelineDayView should not import useSyncedCurrentDate',
	);
	assert.strictEqual(
		timelineDayViewSource.includes('initialDate'),
		false,
		'TimelineDayView should not accept initialDate prop once root owns currentDate',
	);
	assert.strictEqual(
		timelineDayViewSource.includes('onDateChange'),
		false,
		'TimelineDayView should not accept onDateChange prop once root owns currentDate',
	);
	assert.strictEqual(
		timelineViewSource.includes('currentDate={currentDate}'),
		true,
		'timeline root should pass currentDate to day view directly',
	);
});

void test('timeline model uses flat event segments instead of row matrix', () => {
	assert.strictEqual(
		timelineTypesSource.includes('eventRows: EventSegment[][]'),
		false,
		'TimelineDayModel should not keep nested EventSegment[][] rows',
	);
	assert.strictEqual(
		timelineTypesSource.includes('eventSegments: EventSegment[]'),
		true,
		'TimelineDayModel should expose flat EventSegment[]',
	);
	assert.strictEqual(
		timelineModelServiceSource.includes('segments: eventRows.flat()'),
		false,
		'Timeline timed visual model should consume flat segments directly',
	);
	assert.strictEqual(
		timelineModelServiceSource.includes('segments: eventSegments'),
		true,
		'Timeline timed visual model should use flat eventSegments directly',
	);
});

void test('timeline resize commit predicate is integrated in hook layer', () => {
	assert.strictEqual(
		Object.keys(legacyTimeGridInteractionModules).length > 0,
		false,
		'timeline should not keep a dedicated time-grid-interactions utility for only resize predicate',
	);
	assert.strictEqual(
		timelineTimedInteractionsSource.includes('export const hasTimelineResizeChange ='),
		true,
		'timeline resize commit predicate should live in the timeline timed interactions hook module',
	);
});

void test('timeline view does not depend on main plugin type import', () => {
	assert.strictEqual(
		timelineViewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'timeline view should use narrow local plugin context instead of main plugin type',
	);
	assert.strictEqual(
		timelineViewSource.includes("from '../shared/view/dated-event-item-view'"),
		true,
		'timeline view should consume shared dated item view base class',
	);
	assert.strictEqual(
		timelineViewSource.includes("extends DatedEventItemView<TimelineUIProps['calendar']>"),
		true,
		'timeline view should extend shared dated item view base',
	);
	assert.strictEqual(
		timelineViewSource.includes('async onOpen(): Promise<void>'),
		false,
		'timeline view should not duplicate open lifecycle logic once base handles it',
	);
	assert.strictEqual(
		timelineViewSource.includes('super(leaf, plugin);'),
		true,
		'timeline view constructor should pass plugin context to shared dated item view base',
	);
	assert.strictEqual(
		timelineViewSource.includes('prepareItemViewContentContainer(this.containerEl)'),
		false,
		'timeline view should not duplicate content container prep logic inline',
	);
});
