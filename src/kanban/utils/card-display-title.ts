import { parseWikiLinkParts } from '../../shared/utils/wiki-link';

export function resolveCardDisplayTitle(titleLine: string, fallback: string): string {
	const trimmed = titleLine.trim();
	if (!trimmed.startsWith('[[') || !trimmed.endsWith(']]')) return titleLine;
	const parsed = parseWikiLinkParts(titleLine);
	const alias = parsed?.alias?.trim();
	return alias && alias.length > 0 ? alias : fallback;
}
