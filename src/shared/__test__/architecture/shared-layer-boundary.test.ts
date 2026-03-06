import dayTimeGridSource from '../../../calendar/_components/day-week/DayTimeGrid.tsx?raw';
import weekTimeGridSource from '../../../calendar/_components/day-week/WeekTimeGrid.tsx?raw';
import allDayHookSource from '../../../calendar/hooks/use-all-day-event-interactions.ts?raw';
import timelineTimeGridSource from '../../../timeline/_components/TimelineTimeGrid.tsx?raw';
import timedHookSource from '../../hooks/use-timed-grid-event-interactions.ts?raw';
import singleColumnTimedGridSource from '../../time-grid/SingleColumnTimedGrid.tsx?raw';
import timeGridOverlayLayersSource from '../../time-grid/TimeGridOverlayLayers.tsx?raw';
import datedEventItemViewSource from '../../view/dated-event-item-view.ts?raw';
import itemViewContainerSource from '../../view/item-view-container.ts?raw';
import mountedItemViewSource from '../../view/mounted-item-view.ts?raw';
import { assert, test } from 'vitest';

const sharedSourceModules: Record<string, string> = import.meta.glob('../../**/*.{ts,tsx}', {
	eager: true,
	import: 'default',
	query: '?raw',
});

const legacySingleColumnViewModules = import.meta.glob(
	'../../time-grid/SingleColumnTimedGridView.tsx',
);
const legacySingleColumnBaseModules = import.meta.glob(
	'../../time-grid/SingleColumnTimedGridBase.tsx',
);

const collectModuleSpecifiers = (source: string): string[] => {
	const matches: string[] = [];
	const importExportPattern = /(?:import|export)\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
	const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
	let match: RegExpExecArray | null;
	while ((match = importExportPattern.exec(source)) !== null) {
		if (match[1]) matches.push(match[1]);
	}
	while ((match = dynamicImportPattern.exec(source)) !== null) {
		if (match[1]) matches.push(match[1]);
	}
	return matches;
};

const normalizeSlashes = (value: string): string => value.replace(/\\/g, '/');
const toSrcRelativePath = (modulePath: string): string =>
	`shared/${modulePath.replace(/^\.\.\/\.\.\//, '')}`;
const resolveSpecifierFromModule = (modulePath: string, specifier: string): string => {
	const stack = modulePath.split('/').slice(0, -1);
	for (const part of specifier.split('/')) {
		if (!part || part === '.') continue;
		if (part === '..') {
			stack.pop();
			continue;
		}
		stack.push(part);
	}
	return normalizeSlashes(stack.join('/'));
};

void test('shared layer does not depend on feature or root utility layers', () => {
	const forbiddenRoots = new Set(['calendar', 'kanban', 'kanban-list', 'timeline', 'utils']);
	const violations: string[] = [];

	for (const [modulePath, source] of Object.entries(sharedSourceModules)) {
		if (modulePath.includes('/__test__/')) continue;
		const srcRelativePath = toSrcRelativePath(modulePath);
		const specifiers = collectModuleSpecifiers(source).filter((specifier) =>
			specifier.startsWith('.'),
		);

		for (const specifier of specifiers) {
			const relativeToSrc = resolveSpecifierFromModule(srcRelativePath, specifier);
			const [topLevel] = relativeToSrc.split('/');
			if (!topLevel || topLevel === 'shared') {
				continue;
			}
			if (!forbiddenRoots.has(topLevel)) {
				continue;
			}
			violations.push(`src/${srcRelativePath} -> ${specifier} (${topLevel})`);
		}
	}

	assert.strictEqual(
		violations.length,
		0,
		`shared layer boundary violations:\n${violations.join('\n')}`,
	);
});

void test('single-column timed grid removes view adapter pass-through layer', () => {
	assert.strictEqual(
		Object.keys(legacySingleColumnViewModules).length,
		0,
		'shared single-column timed grid should not keep a dedicated view pass-through adapter file',
	);
	assert.strictEqual(
		dayTimeGridSource.includes("from '../../../shared/time-grid/SingleColumnTimedGridView'"),
		false,
		'calendar day grid should not import legacy SingleColumnTimedGridView adapter',
	);
	assert.strictEqual(
		timelineTimeGridSource.includes("from '../../shared/time-grid/SingleColumnTimedGridView'"),
		false,
		'timeline grid should not import legacy SingleColumnTimedGridView adapter',
	);
	assert.strictEqual(
		dayTimeGridSource.includes("from '../../../shared/time-grid/SingleColumnTimedGrid'"),
		true,
		'calendar day grid should use shared SingleColumnTimedGrid directly',
	);
	assert.strictEqual(
		timelineTimeGridSource.includes("from '../../shared/time-grid/SingleColumnTimedGrid'"),
		true,
		'timeline grid should use shared SingleColumnTimedGrid directly',
	);
	assert.strictEqual(
		dayTimeGridSource.includes('buildSingleColumnTimedGridState'),
		true,
		'calendar day grid should map wide view props into structured shared grid state',
	);
	assert.strictEqual(
		timelineTimeGridSource.includes('buildSingleColumnTimedGridState'),
		true,
		'timeline grid should map wide view props into structured shared grid state',
	);
});

void test('single-column timed grid consumes structured state instead of wide view prop bag', () => {
	assert.strictEqual(
		singleColumnTimedGridSource.includes('view: SingleColumnTimedViewProps'),
		false,
		'shared timed grid should not accept wide SingleColumnTimedViewProps directly',
	);
	assert.strictEqual(
		Object.keys(legacySingleColumnBaseModules).length,
		0,
		'shared timed grid should not keep a pass-through base file with prop forwarding only',
	);
	assert.strictEqual(
		singleColumnTimedGridSource.includes("from './SingleColumnTimedGridBase'"),
		false,
		'shared timed grid should not import legacy SingleColumnTimedGridBase pass-through wrapper',
	);
	assert.strictEqual(
		singleColumnTimedGridSource.includes('state: SingleColumnTimedGridState'),
		true,
		'shared timed grid should accept structured SingleColumnTimedGridState',
	);
});

void test('timed and all-day resize hooks reuse shared window pointer listener helper', () => {
	assert.strictEqual(
		timedHookSource.includes('registerWindowPointerMoveAndUp'),
		true,
		'timed grid interactions should reuse shared window pointer listener helper',
	);
	assert.strictEqual(
		allDayHookSource.includes('registerWindowPointerMoveAndUp'),
		true,
		'calendar all-day interactions should reuse shared window pointer listener helper',
	);
	assert.strictEqual(
		timedHookSource.includes("window.addEventListener('pointermove'"),
		false,
		'timed grid interactions should not inline window pointer listener wiring',
	);
	assert.strictEqual(
		allDayHookSource.includes("window.addEventListener('pointermove'"),
		false,
		'calendar all-day interactions should not inline window pointer listener wiring',
	);
});

void test('week and single-column timed grids reuse shared overlay layers renderer', () => {
	assert.strictEqual(
		timeGridOverlayLayersSource.length > 0,
		true,
		'shared time-grid layer should provide a reusable overlay renderer component',
	);
	assert.strictEqual(
		weekTimeGridSource.includes("from '../../../shared/time-grid/TimeGridOverlayLayers'"),
		true,
		'week timed grid should consume shared overlay renderer',
	);
	assert.strictEqual(
		singleColumnTimedGridSource.includes("from './TimeGridOverlayLayers'"),
		true,
		'single-column timed grid should consume shared overlay renderer',
	);
	assert.strictEqual(
		weekTimeGridSource.includes('<TimeGridRangeOverlay'),
		false,
		'week timed grid should not inline duplicated range overlay blocks',
	);
	assert.strictEqual(
		singleColumnTimedGridSource.includes('<TimeGridRangeOverlay'),
		false,
		'single-column timed grid should not inline duplicated range overlay blocks',
	);
});

void test('dated event item view builds on shared mounted item view and keeps one-off helpers local', () => {
	assert.strictEqual(
		mountedItemViewSource.length > 0,
		true,
		'shared view layer should expose a mounted item view base for common container lifecycle',
	);
	assert.strictEqual(
		datedEventItemViewSource.includes("from './mounted-item-view'"),
		true,
		'dated event item view should build on the shared mounted item view base',
	);
	assert.strictEqual(
		datedEventItemViewSource.includes('extends MountedItemView'),
		true,
		'dated event item view should extend the shared mounted item view base',
	);
	assert.strictEqual(
		itemViewContainerSource.includes('mountItemViewWithResource'),
		false,
		'item-view-container should not keep resource-specific mount helper after reintegration',
	);
	assert.strictEqual(
		itemViewContainerSource.includes('createItemViewNoteOpener'),
		false,
		'item-view-container should not keep dated-event-only note opener helper after reintegration',
	);
});
