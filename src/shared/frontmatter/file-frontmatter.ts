export type FrontmatterFileLike = {
	path: string;
};

export type FrontmatterMetadataApp = {
	metadataCache: {
		getFileCache(file: FrontmatterFileLike): { frontmatter?: Record<string, unknown> } | null;
	};
};

export type FrontmatterMutationApp = {
	fileManager: {
		processFrontMatter(
			file: FrontmatterFileLike,
			updater: (frontmatter: Record<string, unknown>) => void,
		): Promise<void>;
	};
};

export type FrontmatterApp = FrontmatterMetadataApp & FrontmatterMutationApp;

const getFileFrontmatter = (
	app: FrontmatterMetadataApp,
	file: FrontmatterFileLike,
): Record<string, unknown> | undefined => app.metadataCache.getFileCache(file)?.frontmatter;

export function readFrontmatterValue(
	app: FrontmatterMetadataApp,
	file: FrontmatterFileLike,
	key: string,
): unknown {
	return getFileFrontmatter(app, file)?.[key];
}

export function readFrontmatterString(
	app: FrontmatterMetadataApp,
	file: FrontmatterFileLike,
	key: string,
): string | null {
	const value = readFrontmatterValue(app, file, key);
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function setFrontmatterValue(
	app: FrontmatterMutationApp,
	file: FrontmatterFileLike,
	key: string,
	value: unknown,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter[key] = value;
	});
}

export async function removeFrontmatterKey(
	app: FrontmatterMutationApp,
	file: FrontmatterFileLike,
	key: string,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		delete frontmatter[key];
	});
}
