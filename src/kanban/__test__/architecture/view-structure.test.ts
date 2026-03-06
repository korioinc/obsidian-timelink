import laneColumnSource from '../../_components/LaneColumn.tsx?raw';
import kanbanManagerServiceSource from '../../services/manager-service.ts?raw';
import unifiedActionServiceSource from '../../services/view-action-service.ts?raw';
import kanbanTypesSource from '../../types.ts?raw';
import kanbanViewSource from '../../view.tsx?raw';
import kanbanRootSource from '../../view/KanbanRoot.tsx?raw';
import viewCardMenuSource from '../../view/card-menu.ts?raw';
import headerActionsSource from '../../view/header-actions.ts?raw';
import kanbanModalSource from '../../view/modal.ts?raw';
import { assert, test } from 'vitest';

const legacyContextServiceModules = import.meta.glob('../../services/view-context-service.ts');
const legacyRootPropsServiceModules = import.meta.glob('../../services/view-root-props-service.ts');
const legacyHeaderActionServiceModules = import.meta.glob(
	'../../services/header-action-service.ts',
);
const legacyCardActionsServiceModules = import.meta.glob(
	'../../services/view-card-actions-service.ts',
);
const legacyCrossBoardServiceModules = import.meta.glob(
	'../../services/view-cross-board-service.ts',
);

void test('kanban view does not depend on pass-through view context/root-props services', () => {
	assert.strictEqual(
		kanbanViewSource.includes("from './services/view-context-service'"),
		false,
		'kanban/view.tsx should inline view context composition',
	);
	assert.strictEqual(
		kanbanViewSource.includes("from './services/view-root-props-service'"),
		false,
		'kanban/view.tsx should inline root props composition',
	);
});

void test('kanban pass-through service files are removed', () => {
	assert.strictEqual(
		Object.keys(legacyContextServiceModules).length,
		0,
		'view-context-service.ts should be removed after reintegration',
	);
	assert.strictEqual(
		Object.keys(legacyRootPropsServiceModules).length,
		0,
		'view-root-props-service.ts should be removed after reintegration',
	);
});

void test('kanban header actions live with view-layer code, not services', () => {
	assert.strictEqual(
		Object.keys(legacyHeaderActionServiceModules).length,
		0,
		'kanban should not keep view-specific header action wiring under services',
	);
	assert.strictEqual(
		headerActionsSource.length > 0,
		true,
		'kanban should keep header action wiring under view-layer modules',
	);
	assert.strictEqual(
		kanbanViewSource.includes("from './services/header-action-service'"),
		false,
		'kanban view should not import header actions from service layer',
	);
	assert.strictEqual(
		kanbanViewSource.includes("from './view/header-actions'"),
		true,
		'kanban view should import header actions from view-layer module',
	);
});

void test('kanban root props do not keep an unused accent color prop', () => {
	assert.strictEqual(
		kanbanRootSource.includes('accentColor?:'),
		false,
		'KanbanRoot props should not declare an unused accentColor prop',
	);
	assert.strictEqual(
		kanbanViewSource.includes('accentColor:'),
		false,
		'kanban view should not pass unused accentColor prop',
	);
});

void test('kanban preventUnhandled listener is centralized in root, not per lane', () => {
	assert.strictEqual(
		laneColumnSource.includes('@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'),
		false,
		'LaneColumn should not import preventUnhandled',
	);
	assert.strictEqual(
		laneColumnSource.includes('preventUnhandled.start()'),
		false,
		'LaneColumn should not start preventUnhandled per lane instance',
	);
	assert.strictEqual(
		kanbanRootSource.includes('@atlaskit/pragmatic-drag-and-drop/prevent-unhandled'),
		true,
		'KanbanRoot should import preventUnhandled for single-point lifecycle management',
	);
	assert.strictEqual(
		kanbanRootSource.includes('preventUnhandled.start()'),
		true,
		'KanbanRoot should start preventUnhandled once at root lifecycle',
	);
	assert.strictEqual(
		kanbanRootSource.includes('preventUnhandled.stop()'),
		true,
		'KanbanRoot should stop preventUnhandled at root unmount',
	);
});

void test('kanban view uses a single unified service context factory', () => {
	assert.strictEqual(
		kanbanViewSource.includes('createBoardServiceContext'),
		false,
		'kanban view should not keep board-only service context factory',
	);
	assert.strictEqual(
		kanbanViewSource.includes('createCardActionsServiceContext'),
		false,
		'kanban view should not keep card-actions-only service context factory',
	);
	assert.strictEqual(
		kanbanViewSource.includes('createCrossBoardServiceContext'),
		false,
		'kanban view should not keep cross-board-only service context factory',
	);
	assert.strictEqual(
		kanbanViewSource.includes('createServiceContext'),
		true,
		'kanban view should compose one shared service context factory',
	);
});

void test('kanban view card and cross-board action layers are reintegrated into unified action service', () => {
	assert.strictEqual(
		Object.keys(legacyCardActionsServiceModules).length,
		0,
		'kanban should not keep split view-card-actions-service after reintegration',
	);
	assert.strictEqual(
		Object.keys(legacyCrossBoardServiceModules).length,
		0,
		'kanban should not keep split view-cross-board-service after reintegration',
	);
	assert.strictEqual(
		unifiedActionServiceSource.length > 0,
		true,
		'kanban should provide unified view-action-service for root action orchestration',
	);
	assert.strictEqual(
		kanbanViewSource.includes("from './services/view-action-service'"),
		true,
		'kanban view should delegate action composition to unified view-action-service',
	);
	assert.strictEqual(
		kanbanViewSource.includes('buildKanbanRootActionHandlers('),
		true,
		'kanban view should build root handlers from unified action service',
	);
});

void test('kanban root action handler signatures are centralized in shared types module', () => {
	assert.strictEqual(
		kanbanTypesSource.includes('export type KanbanRootActionHandlers = {'),
		true,
		'kanban shared types should define root action handler signature once',
	);
	assert.strictEqual(
		unifiedActionServiceSource.includes("import type { KanbanRootActionHandlers } from '../types'"),
		true,
		'kanban action service should reuse shared root action handler type',
	);
	assert.strictEqual(
		kanbanRootSource.includes('KanbanRootProps = KanbanRootActionHandlers & {'),
		true,
		'KanbanRoot props should reuse shared root action handler type',
	);
	assert.strictEqual(
		laneColumnSource.includes('type LaneColumnActionHandlers = Pick<'),
		true,
		'LaneColumn props should derive action handlers via Pick from shared root action type',
	);
});

void test('card removal approval modal uses Obsidian Setting layout for linked cleanup toggle', () => {
	assert.strictEqual(
		viewCardMenuSource.includes('Setting'),
		true,
		'card removal approval modal should use Obsidian Setting for the linked cleanup toggle',
	);
	assert.strictEqual(
		viewCardMenuSource.includes('new Setting(contentEl)'),
		true,
		'card removal approval modal should create the linked cleanup toggle through Setting',
	);
	assert.strictEqual(
		viewCardMenuSource.includes('checkbox-container'),
		false,
		'card removal approval modal should not use checkbox-container because it collapses modal copy layout',
	);
});

void test('kanban layer does not depend on main plugin type imports', () => {
	assert.strictEqual(
		kanbanViewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'kanban view should use narrow local plugin context instead of main plugin type',
	);
	assert.strictEqual(
		kanbanModalSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban modal should use narrow local plugin context instead of main plugin type',
	);
	assert.strictEqual(
		kanbanManagerServiceSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban manager service should use narrow local plugin context instead of main plugin type',
	);
});
