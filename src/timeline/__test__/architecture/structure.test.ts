/* eslint-disable import/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const resolveProjectRoot = (): string => {
	const testFilePath = fileURLToPath(import.meta.url);
	return path.resolve(path.dirname(testFilePath), '../../../..');
};

void test('timeline day view consumes date from root without local date sync hook', () => {
	const projectRoot = resolveProjectRoot();
	const dayViewPath = path.join(projectRoot, 'src/timeline/view/timeline-day-view.tsx');
	const viewPath = path.join(projectRoot, 'src/timeline/view.tsx');
	const dayViewSource = readFileSync(dayViewPath, 'utf8');
	const viewSource = readFileSync(viewPath, 'utf8');

	assert.equal(
		dayViewSource.includes("from '../../shared/hooks/use-date-sync'"),
		false,
		'TimelineDayView should not import useSyncedCurrentDate',
	);
	assert.equal(
		dayViewSource.includes('initialDate'),
		false,
		'TimelineDayView should not accept initialDate prop once root owns currentDate',
	);
	assert.equal(
		dayViewSource.includes('onDateChange'),
		false,
		'TimelineDayView should not accept onDateChange prop once root owns currentDate',
	);
	assert.equal(
		viewSource.includes('currentDate={currentDate}'),
		true,
		'timeline root should pass currentDate to day view directly',
	);
});

void test('timeline model uses flat event segments instead of row matrix', () => {
	const projectRoot = resolveProjectRoot();
	const typesPath = path.join(projectRoot, 'src/timeline/types.ts');
	const modelServicePath = path.join(projectRoot, 'src/timeline/services/model-service.ts');
	const typesSource = readFileSync(typesPath, 'utf8');
	const modelServiceSource = readFileSync(modelServicePath, 'utf8');

	assert.equal(
		typesSource.includes('eventRows: EventSegment[][]'),
		false,
		'TimelineDayModel should not keep nested EventSegment[][] rows',
	);
	assert.equal(
		typesSource.includes('eventSegments: EventSegment[]'),
		true,
		'TimelineDayModel should expose flat EventSegment[]',
	);
	assert.equal(
		modelServiceSource.includes('segments: eventRows.flat()'),
		false,
		'Timeline timed visual model should consume flat segments directly',
	);
	assert.equal(
		modelServiceSource.includes('segments: eventSegments'),
		true,
		'Timeline timed visual model should use flat eventSegments directly',
	);
});

void test('timeline resize commit predicate is integrated in hook layer', () => {
	const projectRoot = resolveProjectRoot();
	const hookPath = path.join(projectRoot, 'src/timeline/hooks/use-timeline-timed-interactions.ts');
	const legacyUtilPath = path.join(projectRoot, 'src/timeline/utils/time-grid-interactions.ts');
	const hookSource = readFileSync(hookPath, 'utf8');

	assert.equal(
		existsSync(legacyUtilPath),
		false,
		'timeline should not keep a dedicated time-grid-interactions utility for only resize predicate',
	);
	assert.equal(
		hookSource.includes('export const hasTimelineResizeChange ='),
		true,
		'timeline resize commit predicate should live in the timeline timed interactions hook module',
	);
});

void test('timeline view does not depend on main plugin type import', () => {
	const projectRoot = resolveProjectRoot();
	const viewPath = path.join(projectRoot, 'src/timeline/view.tsx');
	const viewSource = readFileSync(viewPath, 'utf8');

	assert.equal(
		viewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'timeline view should use narrow local plugin context instead of main plugin type',
	);
	assert.equal(
		viewSource.includes("from '../shared/view/dated-event-item-view'"),
		true,
		'timeline view should consume shared dated item view base class',
	);
	assert.equal(
		viewSource.includes("extends DatedEventItemView<TimelineUIProps['calendar']>"),
		true,
		'timeline view should extend shared dated item view base',
	);
	assert.equal(
		viewSource.includes('async onOpen(): Promise<void>'),
		false,
		'timeline view should not duplicate open lifecycle logic once base handles it',
	);
	assert.equal(
		viewSource.includes('super(leaf, plugin);'),
		true,
		'timeline view constructor should pass plugin context to shared dated item view base',
	);
	assert.equal(
		viewSource.includes('prepareItemViewContentContainer(this.containerEl)'),
		false,
		'timeline view should not duplicate content container prep logic inline',
	);
});
