import { extractFirstWikiLinkPath } from '../../shared/utils/wiki-link';

type CardTitleParts = {
	titleLine: string;
	rest: string;
};

export function splitCardTitle(title: string): CardTitleParts {
	const lines = title.replace(/\r\n/g, '\n').split('\n');
	const titleLine = lines.shift()?.trim() ?? '';
	const rest = lines.join('\n').trimEnd();
	return { titleLine, rest };
}

export function getFirstWikiLinkPath(value: string): string | null {
	return extractFirstWikiLinkPath(value);
}

export function buildCardTitleWithPrimaryLink(link: string, originalTitle: string): string {
	const { rest } = splitCardTitle(originalTitle);
	const normalizedRest = rest.replace(/^(?:\s*\n)+/, '');
	return normalizedRest ? `${link}\n${normalizedRest}` : link;
}
