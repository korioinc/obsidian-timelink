import type { App, TFile } from 'obsidian';

const getFileFrontmatter = (app: App, file: TFile): Record<string, unknown> | undefined =>
	app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;

export function readFrontmatterValue(app: App, file: TFile, key: string): unknown {
	return getFileFrontmatter(app, file)?.[key];
}

export function readFrontmatterString(app: App, file: TFile, key: string): string | null {
	const value = readFrontmatterValue(app, file, key);
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function setFrontmatterValue(
	app: App,
	file: TFile,
	key: string,
	value: unknown,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter[key] = value;
	});
}

export async function removeFrontmatterKey(app: App, file: TFile, key: string): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		delete frontmatter[key];
	});
}
