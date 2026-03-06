/* eslint-disable import/no-nodejs-modules */
import { TIMELINK_CARD_KEY } from '../../../shared/frontmatter/timelink-frontmatter';
import {
	extractLinkedCardPathFromFrontmatter,
	resolveLinkedCardFileFromFrontmatter,
} from '../../services/linked-card-service';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('extractLinkedCardPathFromFrontmatter returns first wikilink path', () => {
	const frontmatter: Record<string, unknown> = {
		[TIMELINK_CARD_KEY]: '[[Cards/My card|Card]]',
	};

	assert.equal(extractLinkedCardPathFromFrontmatter(frontmatter), 'Cards/My card');
});

void test('extractLinkedCardPathFromFrontmatter returns null for missing or invalid values', () => {
	assert.equal(extractLinkedCardPathFromFrontmatter(undefined), null);
	assert.equal(
		extractLinkedCardPathFromFrontmatter({
			[TIMELINK_CARD_KEY]: 1,
		}),
		null,
	);
	assert.equal(
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
				assert.equal(linkPath, 'Cards/My card');
				assert.equal(sourcePath, 'Events/Example.md');
				return expectedFile;
			},
		},
	};

	const resolved = resolveLinkedCardFileFromFrontmatter(app as never, 'Events/Example.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/My card]]',
	});
	assert.equal(resolved, expectedFile);
});

void test('resolveLinkedCardFileFromFrontmatter returns null when card path is unavailable', () => {
	const app = {
		metadataCache: {
			getFirstLinkpathDest: () => {
				throw new Error('must not be called');
			},
		},
	};

	assert.equal(resolveLinkedCardFileFromFrontmatter(app as never, 'Events/Example.md', {}), null);
});
