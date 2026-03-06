/* eslint-disable import/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const collectSharedSourceFiles = (directory: string): string[] => {
	const entries = readdirSync(directory, { withFileTypes: true });
	const results: string[] = [];
	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '__test__') {
				continue;
			}
			results.push(...collectSharedSourceFiles(fullPath));
			continue;
		}
		if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
			results.push(fullPath);
		}
	}
	return results;
};

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

void test('shared layer does not depend on feature or root utility layers', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const srcRoot = path.join(projectRoot, 'src');
	const sharedRoot = path.join(srcRoot, 'shared');
	const sharedFiles = collectSharedSourceFiles(sharedRoot);
	const forbiddenRoots = new Set(['calendar', 'kanban', 'kanban-list', 'timeline', 'utils']);
	const violations: string[] = [];

	for (const filePath of sharedFiles) {
		const source = readFileSync(filePath, 'utf8');
		const specifiers = collectModuleSpecifiers(source).filter((specifier) =>
			specifier.startsWith('.'),
		);

		for (const specifier of specifiers) {
			const resolved = path.resolve(path.dirname(filePath), specifier);
			const relativeToSrc = normalizeSlashes(path.relative(srcRoot, resolved));
			const [topLevel] = relativeToSrc.split('/');
			if (!topLevel || topLevel === 'shared') {
				continue;
			}
			if (!forbiddenRoots.has(topLevel)) {
				continue;
			}
			const relativeFilePath = normalizeSlashes(path.relative(projectRoot, filePath));
			violations.push(`${relativeFilePath} -> ${specifier} (${topLevel})`);
		}
	}

	assert.equal(violations.length, 0, `shared layer boundary violations:\n${violations.join('\n')}`);
});

void test('single-column timed grid removes view adapter pass-through layer', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const dayTimeGridPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/DayTimeGrid.tsx',
	);
	const timelineTimeGridPath = path.join(
		projectRoot,
		'src/timeline/_components/TimelineTimeGrid.tsx',
	);
	const viewAdapterPath = path.join(
		projectRoot,
		'src/shared/time-grid/SingleColumnTimedGridView.tsx',
	);
	const dayTimeGridSource = readFileSync(dayTimeGridPath, 'utf8');
	const timelineTimeGridSource = readFileSync(timelineTimeGridPath, 'utf8');

	assert.equal(
		existsSync(viewAdapterPath),
		false,
		'shared single-column timed grid should not keep a dedicated view pass-through adapter file',
	);
	assert.equal(
		dayTimeGridSource.includes("from '../../../shared/time-grid/SingleColumnTimedGridView'"),
		false,
		'calendar day grid should not import legacy SingleColumnTimedGridView adapter',
	);
	assert.equal(
		timelineTimeGridSource.includes("from '../../shared/time-grid/SingleColumnTimedGridView'"),
		false,
		'timeline grid should not import legacy SingleColumnTimedGridView adapter',
	);
	assert.equal(
		dayTimeGridSource.includes("from '../../../shared/time-grid/SingleColumnTimedGrid'"),
		true,
		'calendar day grid should use shared SingleColumnTimedGrid directly',
	);
	assert.equal(
		timelineTimeGridSource.includes("from '../../shared/time-grid/SingleColumnTimedGrid'"),
		true,
		'timeline grid should use shared SingleColumnTimedGrid directly',
	);
	assert.equal(
		dayTimeGridSource.includes('buildSingleColumnTimedGridState'),
		true,
		'calendar day grid should map wide view props into structured shared grid state',
	);
	assert.equal(
		timelineTimeGridSource.includes('buildSingleColumnTimedGridState'),
		true,
		'timeline grid should map wide view props into structured shared grid state',
	);
});

void test('single-column timed grid consumes structured state instead of wide view prop bag', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const gridPath = path.join(projectRoot, 'src/shared/time-grid/SingleColumnTimedGrid.tsx');
	const legacyBasePath = path.join(
		projectRoot,
		'src/shared/time-grid/SingleColumnTimedGridBase.tsx',
	);
	const gridSource = readFileSync(gridPath, 'utf8');

	assert.equal(
		gridSource.includes('view: SingleColumnTimedViewProps'),
		false,
		'shared timed grid should not accept wide SingleColumnTimedViewProps directly',
	);
	assert.equal(
		existsSync(legacyBasePath),
		false,
		'shared timed grid should not keep a pass-through base file with prop forwarding only',
	);
	assert.equal(
		gridSource.includes("from './SingleColumnTimedGridBase'"),
		false,
		'shared timed grid should not import legacy SingleColumnTimedGridBase pass-through wrapper',
	);
	assert.equal(
		gridSource.includes('state: SingleColumnTimedGridState'),
		true,
		'shared timed grid should accept structured SingleColumnTimedGridState',
	);
});

void test('timed and all-day resize hooks reuse shared window pointer listener helper', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const timedHookPath = path.join(
		projectRoot,
		'src/shared/hooks/use-timed-grid-event-interactions.ts',
	);
	const allDayHookPath = path.join(
		projectRoot,
		'src/calendar/hooks/use-all-day-event-interactions.ts',
	);
	const timedHookSource = readFileSync(timedHookPath, 'utf8');
	const allDayHookSource = readFileSync(allDayHookPath, 'utf8');

	assert.equal(
		timedHookSource.includes('registerWindowPointerMoveAndUp'),
		true,
		'timed grid interactions should reuse shared window pointer listener helper',
	);
	assert.equal(
		allDayHookSource.includes('registerWindowPointerMoveAndUp'),
		true,
		'calendar all-day interactions should reuse shared window pointer listener helper',
	);
	assert.equal(
		timedHookSource.includes("window.addEventListener('pointermove'"),
		false,
		'timed grid interactions should not inline window pointer listener wiring',
	);
	assert.equal(
		allDayHookSource.includes("window.addEventListener('pointermove'"),
		false,
		'calendar all-day interactions should not inline window pointer listener wiring',
	);
});

void test('week and single-column timed grids reuse shared overlay layers renderer', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const sharedOverlayPath = path.join(
		projectRoot,
		'src/shared/time-grid/TimeGridOverlayLayers.tsx',
	);
	const weekTimeGridPath = path.join(
		projectRoot,
		'src/calendar/_components/day-week/WeekTimeGrid.tsx',
	);
	const singleColumnGridPath = path.join(
		projectRoot,
		'src/shared/time-grid/SingleColumnTimedGrid.tsx',
	);
	const weekTimeGridSource = readFileSync(weekTimeGridPath, 'utf8');
	const singleColumnGridSource = readFileSync(singleColumnGridPath, 'utf8');

	assert.equal(
		existsSync(sharedOverlayPath),
		true,
		'shared time-grid layer should provide a reusable overlay renderer component',
	);
	assert.equal(
		weekTimeGridSource.includes("from '../../../shared/time-grid/TimeGridOverlayLayers'"),
		true,
		'week timed grid should consume shared overlay renderer',
	);
	assert.equal(
		singleColumnGridSource.includes("from './TimeGridOverlayLayers'"),
		true,
		'single-column timed grid should consume shared overlay renderer',
	);
	assert.equal(
		weekTimeGridSource.includes('<TimeGridRangeOverlay'),
		false,
		'week timed grid should not inline duplicated range overlay blocks',
	);
	assert.equal(
		singleColumnGridSource.includes('<TimeGridRangeOverlay'),
		false,
		'single-column timed grid should not inline duplicated range overlay blocks',
	);
});

void test('dated event item view builds on shared mounted item view and keeps one-off helpers local', () => {
	const testFilePath = fileURLToPath(import.meta.url);
	const projectRoot = path.resolve(path.dirname(testFilePath), '../../../..');
	const mountedViewPath = path.join(projectRoot, 'src/shared/view/mounted-item-view.ts');
	const datedViewPath = path.join(projectRoot, 'src/shared/view/dated-event-item-view.ts');
	const itemViewContainerPath = path.join(projectRoot, 'src/shared/view/item-view-container.ts');
	const datedViewSource = readFileSync(datedViewPath, 'utf8');
	const itemViewContainerSource = readFileSync(itemViewContainerPath, 'utf8');

	assert.equal(
		existsSync(mountedViewPath),
		true,
		'shared view layer should expose a mounted item view base for common container lifecycle',
	);
	assert.equal(
		datedViewSource.includes("from './mounted-item-view'"),
		true,
		'dated event item view should build on the shared mounted item view base',
	);
	assert.equal(
		datedViewSource.includes('extends MountedItemView'),
		true,
		'dated event item view should extend the shared mounted item view base',
	);
	assert.equal(
		itemViewContainerSource.includes('mountItemViewWithResource'),
		false,
		'item-view-container should not keep resource-specific mount helper after reintegration',
	);
	assert.equal(
		itemViewContainerSource.includes('createItemViewNoteOpener'),
		false,
		'item-view-container should not keep dated-event-only note opener helper after reintegration',
	);
});
