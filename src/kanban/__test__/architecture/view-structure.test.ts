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

void test('kanban view does not depend on pass-through view context/root-props services', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/kanban/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		source.includes("from './services/view-context-service'"),
		false,
		'kanban/view.tsx should inline view context composition',
	);
	assert.equal(
		source.includes("from './services/view-root-props-service'"),
		false,
		'kanban/view.tsx should inline root props composition',
	);
});

void test('kanban pass-through service files are removed', () => {
	const projectRoot = resolveProjectRoot();
	const contextServicePath = path.join(projectRoot, 'src/kanban/services/view-context-service.ts');
	const rootPropsServicePath = path.join(
		projectRoot,
		'src/kanban/services/view-root-props-service.ts',
	);

	assert.equal(
		existsSync(contextServicePath),
		false,
		'view-context-service.ts should be removed after reintegration',
	);
	assert.equal(
		existsSync(rootPropsServicePath),
		false,
		'view-root-props-service.ts should be removed after reintegration',
	);
});

void test('kanban header actions live with view-layer code, not services', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/kanban/view.tsx');
	const legacyHeaderServicePath = path.join(
		projectRoot,
		'src/kanban/services/header-action-service.ts',
	);
	const headerActionsPath = path.join(projectRoot, 'src/kanban/view/header-actions.ts');
	const viewSource = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		existsSync(legacyHeaderServicePath),
		false,
		'kanban should not keep view-specific header action wiring under services',
	);
	assert.equal(
		existsSync(headerActionsPath),
		true,
		'kanban should keep header action wiring under view-layer modules',
	);
	assert.equal(
		viewSource.includes("from './services/header-action-service'"),
		false,
		'kanban view should not import header actions from service layer',
	);
	assert.equal(
		viewSource.includes("from './view/header-actions'"),
		true,
		'kanban view should import header actions from view-layer module',
	);
});

void test('kanban root props do not keep an unused accent color prop', () => {
	const projectRoot = resolveProjectRoot();
	const rootFilePath = path.join(projectRoot, 'src/kanban/view/KanbanRoot.tsx');
	const viewFilePath = path.join(projectRoot, 'src/kanban/view.tsx');
	const rootSource = readFileSync(rootFilePath, 'utf8');
	const viewSource = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		rootSource.includes('accentColor?:'),
		false,
		'KanbanRoot props should not declare an unused accentColor prop',
	);
	assert.equal(
		viewSource.includes('accentColor:'),
		false,
		'kanban view should not pass unused accentColor prop',
	);
});

void test('kanban preventUnhandled listener is centralized in root, not per lane', () => {
	const projectRoot = resolveProjectRoot();
	const rootFilePath = path.join(projectRoot, 'src/kanban/view/KanbanRoot.tsx');
	const laneFilePath = path.join(projectRoot, 'src/kanban/_components/LaneColumn.tsx');
	const rootSource = readFileSync(rootFilePath, 'utf8');
	const laneSource = readFileSync(laneFilePath, 'utf8');

	assert.equal(
		laneSource.includes('@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'),
		false,
		'LaneColumn should not import preventUnhandled',
	);
	assert.equal(
		laneSource.includes('preventUnhandled.start()'),
		false,
		'LaneColumn should not start preventUnhandled per lane instance',
	);
	assert.equal(
		rootSource.includes('@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'),
		true,
		'KanbanRoot should import preventUnhandled for single-point lifecycle management',
	);
	assert.equal(
		rootSource.includes('preventUnhandled.start()'),
		true,
		'KanbanRoot should start preventUnhandled once at root lifecycle',
	);
	assert.equal(
		rootSource.includes('preventUnhandled.stop()'),
		true,
		'KanbanRoot should stop preventUnhandled at root unmount',
	);
});

void test('kanban view uses a single unified service context factory', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/kanban/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');

	assert.equal(
		source.includes('createBoardServiceContext'),
		false,
		'kanban view should not keep board-only service context factory',
	);
	assert.equal(
		source.includes('createCardActionsServiceContext'),
		false,
		'kanban view should not keep card-actions-only service context factory',
	);
	assert.equal(
		source.includes('createCrossBoardServiceContext'),
		false,
		'kanban view should not keep cross-board-only service context factory',
	);
	assert.equal(
		source.includes('createServiceContext'),
		true,
		'kanban view should compose one shared service context factory',
	);
});

void test('kanban view card and cross-board action layers are reintegrated into unified action service', () => {
	const projectRoot = resolveProjectRoot();
	const viewFilePath = path.join(projectRoot, 'src/kanban/view.tsx');
	const source = readFileSync(viewFilePath, 'utf8');
	const legacyCardActionsServicePath = path.join(
		projectRoot,
		'src/kanban/services/view-card-actions-service.ts',
	);
	const legacyCrossBoardServicePath = path.join(
		projectRoot,
		'src/kanban/services/view-cross-board-service.ts',
	);
	const unifiedActionServicePath = path.join(
		projectRoot,
		'src/kanban/services/view-action-service.ts',
	);

	assert.equal(
		existsSync(legacyCardActionsServicePath),
		false,
		'kanban should not keep split view-card-actions-service after reintegration',
	);
	assert.equal(
		existsSync(legacyCrossBoardServicePath),
		false,
		'kanban should not keep split view-cross-board-service after reintegration',
	);
	assert.equal(
		existsSync(unifiedActionServicePath),
		true,
		'kanban should provide unified view-action-service for root action orchestration',
	);
	assert.equal(
		source.includes("from './services/view-action-service'"),
		true,
		'kanban view should delegate action composition to unified view-action-service',
	);
	assert.equal(
		source.includes('buildKanbanRootActionHandlers('),
		true,
		'kanban view should build root handlers from unified action service',
	);
});

void test('kanban root action handler signatures are centralized in shared types module', () => {
	const projectRoot = resolveProjectRoot();
	const typesPath = path.join(projectRoot, 'src/kanban/types.ts');
	const actionServicePath = path.join(projectRoot, 'src/kanban/services/view-action-service.ts');
	const rootPath = path.join(projectRoot, 'src/kanban/view/KanbanRoot.tsx');
	const lanePath = path.join(projectRoot, 'src/kanban/_components/LaneColumn.tsx');
	const typesSource = readFileSync(typesPath, 'utf8');
	const actionServiceSource = readFileSync(actionServicePath, 'utf8');
	const rootSource = readFileSync(rootPath, 'utf8');
	const laneSource = readFileSync(lanePath, 'utf8');

	assert.equal(
		typesSource.includes('export type KanbanRootActionHandlers = {'),
		true,
		'kanban shared types should define root action handler signature once',
	);
	assert.equal(
		actionServiceSource.includes("import type { KanbanRootActionHandlers } from '../types'"),
		true,
		'kanban action service should reuse shared root action handler type',
	);
	assert.equal(
		rootSource.includes('KanbanRootProps = KanbanRootActionHandlers & {'),
		true,
		'KanbanRoot props should reuse shared root action handler type',
	);
	assert.equal(
		laneSource.includes('type LaneColumnActionHandlers = Pick<'),
		true,
		'LaneColumn props should derive action handlers via Pick from shared root action type',
	);
});

void test('kanban layer does not depend on main plugin type imports', () => {
	const projectRoot = resolveProjectRoot();
	const viewPath = path.join(projectRoot, 'src/kanban/view.tsx');
	const modalPath = path.join(projectRoot, 'src/kanban/view/modal.ts');
	const managerServicePath = path.join(projectRoot, 'src/kanban/services/manager-service.ts');
	const viewSource = readFileSync(viewPath, 'utf8');
	const modalSource = readFileSync(modalPath, 'utf8');
	const managerServiceSource = readFileSync(managerServicePath, 'utf8');

	assert.equal(
		viewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'kanban view should use narrow local plugin context instead of main plugin type',
	);
	assert.equal(
		modalSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban modal should use narrow local plugin context instead of main plugin type',
	);
	assert.equal(
		managerServiceSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban manager service should use narrow local plugin context instead of main plugin type',
	);
});
