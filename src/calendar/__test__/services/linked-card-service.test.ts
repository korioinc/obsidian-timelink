import { TIMELINK_CARD_KEY } from '../../../shared/frontmatter/timelink-frontmatter';
import {
	extractLinkedCardPathFromFrontmatter,
	resolveLinkedCardFileFromFrontmatter,
} from '../../services/linked-card-service';
import { assert, test } from 'vitest';

void test('extractLinkedCardPathFromFrontmatter returns first wikilink path', () => {
	const frontmatter: Record<string, unknown> = {
		[TIMELINK_CARD_KEY]: '[[Cards/My card|Card]]',
	};

	assert.strictEqual(extractLinkedCardPathFromFrontmatter(frontmatter), 'Cards/My card');
});

void test('extractLinkedCardPathFromFrontmatter returns null for missing or invalid values', () => {
	assert.strictEqual(extractLinkedCardPathFromFrontmatter(undefined), null);
	assert.strictEqual(
		extractLinkedCardPathFromFrontmatter({
			[TIMELINK_CARD_KEY]: 1,
		}),
		null,
	);
	assert.strictEqual(
		extractLinkedCardPathFromFrontmatter({
			[TIMELINK_CARD_KEY]: '',
		}),
		null,
	);
});

void test('resolveLinkedCardFileFromFrontmatter resolves linked file via metadata cache', () => {
	const expectedFile = { path: 'Cards/My card.md' };
	const app = {
		metadataCache: {
			getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
				assert.strictEqual(linkPath, 'Cards/My card');
				assert.strictEqual(sourcePath, 'Events/Example.md');
				return expectedFile;
			},
		},
	};

	const resolved = resolveLinkedCardFileFromFrontmatter(app as never, 'Events/Example.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/My card]]',
	});
	assert.strictEqual(resolved, expectedFile);
});

void test('resolveLinkedCardFileFromFrontmatter returns null when card path is unavailable', () => {
	const app = {
		metadataCache: {
			getFirstLinkpathDest: () => {
				throw new Error('must not be called');
			},
		},
	};

	assert.strictEqual(
		resolveLinkedCardFileFromFrontmatter(app as never, 'Events/Example.md', {}),
		null,
	);
});
