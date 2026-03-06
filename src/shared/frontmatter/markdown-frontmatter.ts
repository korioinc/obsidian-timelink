const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const extractFrontmatterBody = (markdown: string): string | undefined => {
	const normalized = markdown.replace(/\r\n/g, '\n');
	const match = normalized.match(FRONTMATTER_PATTERN);
	return match?.[1];
};

export const hasFrontmatterKey = (frontmatterBody: string, key: string): boolean => {
	const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*:`, 'm');
	return keyPattern.test(frontmatterBody);
};

export const parseFrontmatterValue = (
	frontmatterBody: string,
	key: string,
	options: { caseInsensitive?: boolean } = {},
): string | undefined => {
	const keyPattern = new RegExp(
		`^\\s*${escapeRegExp(key)}\\s*:\\s*(.+?)\\s*$`,
		options.caseInsensitive ? 'mi' : 'm',
	);
	const match = frontmatterBody.match(keyPattern);
	if (!match?.[1]) return undefined;
	let value = match[1].trim();
	const quoted =
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"));
	if (quoted && value.length >= 2) {
		value = value.slice(1, -1).trim();
	}
	return value || undefined;
};
