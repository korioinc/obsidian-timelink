type FrontmatterMap = Record<string, Record<string, unknown>>;

export function createMockFrontmatterApp(initialFrontmatter: FrontmatterMap = {}): {
	app: {
		metadataCache: {
			getFileCache: (file: { path: string }) => {
				frontmatter: Record<string, unknown> | undefined;
			};
		};
		fileManager: {
			processFrontMatter: (
				file: { path: string },
				updater: (frontmatter: Record<string, unknown>) => void,
			) => Promise<void>;
		};
	};
	frontmatterByPath: FrontmatterMap;
} {
	const frontmatterByPath = Object.fromEntries(
		Object.entries(initialFrontmatter).map(([path, frontmatter]) => [path, { ...frontmatter }]),
	);
	const app = {
		metadataCache: {
			getFileCache: (file: { path: string }) => ({ frontmatter: frontmatterByPath[file.path] }),
		},
		fileManager: {
			processFrontMatter: (
				file: { path: string },
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const next = frontmatterByPath[file.path] ?? {};
				frontmatterByPath[file.path] = next;
				updater(next);
				return Promise.resolve();
			},
		},
	};

	return { app, frontmatterByPath };
}
