import { runEventModificationTransaction } from '../../services/event-modification-transaction.ts';
import { assert, expect, test } from 'vitest';

void test('runEventModificationTransaction restores owned event fields and path after a partial write fails', async () => {
	const sourcePath = 'Events/2026-03-01 Before.md';
	const nextPath = 'Events/2026-03-02 After.md';
	const target = { path: sourcePath };
	let eventTitle = 'Before';
	const operations: string[] = [];
	const committedPaths: string[] = [];

	await expect(
		runEventModificationTransaction({
			target,
			sourcePath,
			nextPath,
			rename: (path) => {
				operations.push(`rename:${target.path}->${path}`);
				target.path = path;
				return Promise.resolve();
			},
			writeFrontmatter: () => {
				eventTitle = 'After';
				return Promise.reject(new Error('frontmatter write failed'));
			},
			syncBacklink: () => Promise.resolve(),
			restoreBacklink: () => Promise.resolve(),
			restoreEvent: () => {
				operations.push('restore-event');
				eventTitle = 'Before';
				return Promise.resolve();
			},
			onCommitted: (path) => committedPaths.push(path),
			onRollbackFailed: () => undefined,
		}),
	).rejects.toThrow('frontmatter write failed');

	assert.strictEqual(target.path, sourcePath);
	assert.strictEqual(eventTitle, 'Before');
	assert.deepEqual(committedPaths, []);
	assert.deepEqual(operations, [
		`rename:${sourcePath}->${nextPath}`,
		'restore-event',
		`rename:${nextPath}->${sourcePath}`,
	]);
});

void test('runEventModificationTransaction compensates a partially written linked-card backlink', async () => {
	const sourcePath = 'Events/Before.md';
	const nextPath = 'Events/After.md';
	const target = { path: sourcePath };
	let backlink = 'old-link';
	const operations: string[] = [];

	await expect(
		runEventModificationTransaction({
			target,
			sourcePath,
			nextPath,
			rename: (path) => {
				target.path = path;
				operations.push(`rename:${path}`);
				return Promise.resolve();
			},
			writeFrontmatter: () => Promise.resolve(),
			syncBacklink: () => {
				backlink = 'partial-link';
				return Promise.reject(new Error('backlink failed'));
			},
			restoreBacklink: () => {
				backlink = 'old-link';
				operations.push('restore-backlink');
				return Promise.resolve();
			},
			restoreEvent: () => {
				operations.push('restore-event');
				return Promise.resolve();
			},
			onCommitted: () => undefined,
			onRollbackFailed: () => undefined,
		}),
	).rejects.toThrow('backlink failed');

	assert.strictEqual(backlink, 'old-link');
	assert.strictEqual(target.path, sourcePath);
	assert.deepEqual(operations, [
		`rename:${nextPath}`,
		'restore-backlink',
		'restore-event',
		`rename:${sourcePath}`,
	]);
});

void test('runEventModificationTransaction marks state uncertain when compensation fails', async () => {
	const sourcePath = 'Events/Before.md';
	const target = { path: sourcePath };
	const uncertainPaths: string[] = [];

	await expect(
		runEventModificationTransaction({
			target,
			sourcePath,
			nextPath: 'Events/After.md',
			rename: (path) => {
				target.path = path;
				return Promise.resolve();
			},
			writeFrontmatter: () => Promise.reject(new Error('write failed')),
			syncBacklink: () => Promise.resolve(),
			restoreBacklink: () => Promise.resolve(),
			restoreEvent: () => Promise.reject(new Error('restore failed')),
			onCommitted: () => undefined,
			onRollbackFailed: (path) => uncertainPaths.push(path),
		}),
	).rejects.toMatchObject({ eventStateUncertain: true });

	assert.strictEqual(target.path, sourcePath);
	assert.deepEqual(uncertainPaths, [sourcePath]);
});
