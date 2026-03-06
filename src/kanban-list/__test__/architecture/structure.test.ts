import mountedItemViewSource from '../../../shared/view/mounted-item-view.ts?raw';
import kanbanListModelServiceSource from '../../services/model-service.ts?raw';
import kanbanListViewSource from '../../view.tsx?raw';
import kanbanListItemViewSource from '../../view/index.ts?raw';
import { assert, test } from 'vitest';

void test('kanban-list model service reuses shared kanban frontmatter scanner', () => {
	assert.strictEqual(
		kanbanListModelServiceSource.includes('scanKanbanBoardFrontmatter'),
		true,
		'kanban-list model service should reuse shared kanban frontmatter scanner',
	);
	assert.strictEqual(
		kanbanListModelServiceSource.includes('parseFrontmatterValue('),
		false,
		'kanban-list model service should not parse board color inline with parseFrontmatterValue',
	);
	assert.strictEqual(
		kanbanListModelServiceSource.includes('hasFrontmatterKey('),
		false,
		'kanban-list model service should not detect kanban key inline with hasFrontmatterKey',
	);
});

void test('kanban-list layer does not depend on main plugin type imports', () => {
	assert.strictEqual(
		kanbanListViewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'kanban-list UI should use narrow local plugin context instead of main plugin type',
	);
	assert.strictEqual(
		kanbanListItemViewSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban-list item view should use narrow local plugin context instead of main plugin type',
	);
});

void test('kanban-list item view reuses shared mounted item view base', () => {
	assert.strictEqual(
		mountedItemViewSource.length > 0,
		true,
		'kanban-list should reuse a shared mounted item view base for container lifecycle',
	);
	assert.strictEqual(
		kanbanListItemViewSource.includes("from '../../shared/view/mounted-item-view'"),
		true,
		'kanban-list item view should import the shared mounted item view base',
	);
	assert.strictEqual(
		kanbanListItemViewSource.includes('extends MountedItemView'),
		true,
		'kanban-list item view should extend the shared mounted item view base',
	);
	assert.strictEqual(
		kanbanListItemViewSource.includes('prepareItemViewContentContainer('),
		false,
		'kanban-list item view should not inline content-container mounting boilerplate',
	);
	assert.strictEqual(
		kanbanListItemViewSource.includes('withItemViewContentUnmount('),
		false,
		'kanban-list item view should not inline content-container unmount boilerplate',
	);
});
