import {
	applyEventFrontmatterWithSnapshot,
	createEventFrontmatterSnapshot,
	restoreEventFrontmatterSnapshot,
} from '../../services/event-frontmatter-transaction.ts';
import { assert, test } from 'vitest';

void test('event frontmatter rollback restores owned fields without touching concurrent unrelated edits', () => {
	const frontmatter: Record<string, unknown> = { title: 'Before', custom: 'original' };
	const snapshot = createEventFrontmatterSnapshot();
	applyEventFrontmatterWithSnapshot(frontmatter, { title: 'After', endTime: '10:00' }, snapshot);
	frontmatter.custom = 'user edit';

	assert.strictEqual(restoreEventFrontmatterSnapshot(frontmatter, snapshot), true);
	assert.deepEqual(frontmatter, { title: 'Before', custom: 'user edit' });
});

void test('event frontmatter rollback preserves a concurrent edit to an owned field', () => {
	const frontmatter: Record<string, unknown> = { title: 'Before' };
	const snapshot = createEventFrontmatterSnapshot();
	applyEventFrontmatterWithSnapshot(frontmatter, { title: 'After' }, snapshot);
	frontmatter.title = 'User edit';

	assert.strictEqual(restoreEventFrontmatterSnapshot(frontmatter, snapshot), false);
	assert.strictEqual(frontmatter.title, 'User edit');
});
