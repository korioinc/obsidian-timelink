import { ViewRenderLifecycle } from '../../view/view-render-lifecycle.ts';
import { assert, test } from 'vitest';

void test('closing a mounted view invalidates an unfinished open', () => {
	const lifecycle = new ViewRenderLifecycle();
	const opening = lifecycle.beginOpen();

	const closing = lifecycle.beginClose();

	assert.strictEqual(lifecycle.canRender(opening), false);
	assert.strictEqual(lifecycle.canUnmount(closing), true);
});

void test('only the latest open generation can mount', () => {
	const lifecycle = new ViewRenderLifecycle();
	const first = lifecycle.beginOpen();
	const second = lifecycle.beginOpen();

	assert.strictEqual(lifecycle.canRender(first), false);
	assert.strictEqual(lifecycle.canRender(second), true);
});

void test('a late close completion cannot unmount a newer open', () => {
	const lifecycle = new ViewRenderLifecycle();
	lifecycle.beginOpen();
	const closing = lifecycle.beginClose();
	const reopening = lifecycle.beginOpen();

	assert.strictEqual(lifecycle.canUnmount(closing), false);
	assert.strictEqual(lifecycle.canRender(reopening), true);
});
