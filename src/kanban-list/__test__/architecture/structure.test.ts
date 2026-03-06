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

void test('kanban-list model service reuses shared kanban frontmatter scanner', () => {
	const projectRoot = resolveProjectRoot();
	const modelServicePath = path.join(projectRoot, 'src/kanban-list/services/model-service.ts');
	const source = readFileSync(modelServicePath, 'utf8');

	assert.equal(
		source.includes('scanKanbanBoardFrontmatter'),
		true,
		'kanban-list model service should reuse shared kanban frontmatter scanner',
	);
	assert.equal(
		source.includes('parseFrontmatterValue('),
		false,
		'kanban-list model service should not parse board color inline with parseFrontmatterValue',
	);
	assert.equal(
		source.includes('hasFrontmatterKey('),
		false,
		'kanban-list model service should not detect kanban key inline with hasFrontmatterKey',
	);
});

void test('kanban-list layer does not depend on main plugin type imports', () => {
	const projectRoot = resolveProjectRoot();
	const listViewPath = path.join(projectRoot, 'src/kanban-list/view.tsx');
	const itemViewPath = path.join(projectRoot, 'src/kanban-list/view/index.ts');
	const listViewSource = readFileSync(listViewPath, 'utf8');
	const itemViewSource = readFileSync(itemViewPath, 'utf8');

	assert.equal(
		listViewSource.includes("import type TimeLinkPlugin from '../main'"),
		false,
		'kanban-list UI should use narrow local plugin context instead of main plugin type',
	);
	assert.equal(
		itemViewSource.includes("import type TimeLinkPlugin from '../../main'"),
		false,
		'kanban-list item view should use narrow local plugin context instead of main plugin type',
	);
});

void test('kanban-list item view reuses shared mounted item view base', () => {
	const projectRoot = resolveProjectRoot();
	const itemViewPath = path.join(projectRoot, 'src/kanban-list/view/index.ts');
	const mountedViewPath = path.join(projectRoot, 'src/shared/view/mounted-item-view.ts');
	const itemViewSource = readFileSync(itemViewPath, 'utf8');

	assert.equal(
		existsSync(mountedViewPath),
		true,
		'kanban-list should reuse a shared mounted item view base for container lifecycle',
	);
	assert.equal(
		itemViewSource.includes("from '../../shared/view/mounted-item-view'"),
		true,
		'kanban-list item view should import the shared mounted item view base',
	);
	assert.equal(
		itemViewSource.includes('extends MountedItemView'),
		true,
		'kanban-list item view should extend the shared mounted item view base',
	);
	assert.equal(
		itemViewSource.includes('prepareItemViewContentContainer('),
		false,
		'kanban-list item view should not inline content-container mounting boilerplate',
	);
	assert.equal(
		itemViewSource.includes('withItemViewContentUnmount('),
		false,
		'kanban-list item view should not inline content-container unmount boilerplate',
	);
});
