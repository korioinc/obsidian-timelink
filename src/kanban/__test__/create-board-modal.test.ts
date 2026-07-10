import { createBoardAndAttemptOpen } from '../view/create-board-flow.ts';
import { assert, expect, test } from 'vitest';

void test('a board remains successfully created when opening it fails', async () => {
	const file = { path: 'Boards/Roadmap.md' };
	const calls: string[] = [];
	const result = await createBoardAndAttemptOpen(
		() => {
			calls.push('create');
			return Promise.resolve(file);
		},
		(createdFile) => {
			calls.push(`open:${createdFile.path}`);
			return Promise.reject(new Error('open failed'));
		},
	);

	assert.deepEqual(calls, ['create', `open:${file.path}`]);
	assert.strictEqual(result.file, file);
	assert.strictEqual(result.opened, false);
	assert.match(String(result.openError), /open failed/);
});

void test('a board creation failure is still reported as a failed submission', async () => {
	let opened = false;

	await expect(
		createBoardAndAttemptOpen(
			() => Promise.reject(new Error('create failed')),
			() => {
				opened = true;
				return Promise.resolve();
			},
		),
	).rejects.toThrow('create failed');
	assert.strictEqual(opened, false);
});
