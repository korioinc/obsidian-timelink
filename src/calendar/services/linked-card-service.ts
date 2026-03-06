import { TIMELINK_CARD_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { extractFirstWikiLinkPath } from '../../shared/utils/wiki-link';

type Frontmatter = Record<string, unknown> | null | undefined;
type LinkedCardLookupApp = {
	metadataCache: {
		getFirstLinkpathDest(path: string, sourcePath: string): { path: string } | null;
	};
};

export const extractLinkedCardPathFromFrontmatter = (frontmatter: Frontmatter): string | null => {
	const existingCardLink =
		typeof frontmatter?.[TIMELINK_CARD_KEY] === 'string' ? frontmatter[TIMELINK_CARD_KEY] : null;
	return extractFirstWikiLinkPath(existingCardLink ?? undefined);
};

export const resolveLinkedCardFileFromFrontmatter = (
	app: LinkedCardLookupApp,
	sourcePath: string,
	frontmatter: Frontmatter,
) => {
	const cardPath = extractLinkedCardPathFromFrontmatter(frontmatter);
	if (!cardPath) return null;
	return app.metadataCache.getFirstLinkpathDest(cardPath, sourcePath);
};
