import { ViewRenderLifecycle } from '../../shared/view/view-render-lifecycle.ts';
import { assert, test } from 'vitest';

void test('close invalidates pending opens and blocks stale renders', () => {
	const lifecycle = new ViewRenderLifecycle();
	const pendingOpen = lifecycle.beginOpen();

	lifecycle.beginClose();

	assert.strictEqual(lifecycle.canRender(pendingOpen), false);
	assert.strictEqual(lifecycle.canRender(), false);
});

void test('a newer open generation supersedes an older pending open', () => {
	const lifecycle = new ViewRenderLifecycle();
	const firstOpen = lifecycle.beginOpen();
	const secondOpen = lifecycle.beginOpen();

	assert.strictEqual(lifecycle.canRender(firstOpen), false);
	assert.strictEqual(lifecycle.canRender(secondOpen), true);
});

void test('a reopen invalidates a pending close and prevents it from unmounting the new view', () => {
	const lifecycle = new ViewRenderLifecycle();
	lifecycle.beginOpen();
	const pendingClose = lifecycle.beginClose();
	const reopened = lifecycle.beginOpen();

	assert.strictEqual(lifecycle.canUnmount(pendingClose), false);
	assert.strictEqual(lifecycle.canRender(reopened), true);
});
