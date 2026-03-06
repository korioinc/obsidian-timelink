type WikiLinkParts = {
	path: string;
	subpath: string;
	alias: string | null;
};

const normalizeLinktext = (linktext: string): string => {
	const trimmed = linktext.trim();
	if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
		return trimmed.slice(2, -2).trim();
	}
	return trimmed;
};

export const parseWikiLinkParts = (linktext: string): WikiLinkParts | null => {
	const normalized = normalizeLinktext(linktext);
	if (!normalized) return null;

	const [targetRaw, aliasRaw] = normalized.split('|', 2);
	const target = targetRaw?.trim() ?? '';
	if (!target) return null;

	const hashIndex = target.indexOf('#');
	const path = (hashIndex === -1 ? target : target.slice(0, hashIndex)).trim();
	if (!path) return null;

	const subpath = hashIndex === -1 ? '' : target.slice(hashIndex).trim();
	const alias = aliasRaw?.trim() || null;
	return { path, subpath, alias };
};

export const extractWikiLinkPath = (linktext: string): string | null =>
	parseWikiLinkParts(linktext)?.path ?? null;

export const extractWikiLinkSubpath = (linktext: string): string =>
	parseWikiLinkParts(linktext)?.subpath ?? '';

export const extractFirstWikiLinkPath = (value?: string): string | null => {
	if (!value) return null;
	const match = value.match(/\[\[([^\]]+)\]\]/);
	if (!match?.[1]) return null;
	return extractWikiLinkPath(match[1]);
};
