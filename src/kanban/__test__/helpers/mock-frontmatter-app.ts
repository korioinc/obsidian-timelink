import type { App, TFile } from 'obsidian';

type FrontmatterMap = Record<string, Record<string, unknown>>;

export function createMockFrontmatterApp(initialFrontmatter: FrontmatterMap = {}): {
	app: App;
	frontmatterByPath: FrontmatterMap;
} {
	const frontmatterByPath = Object.fromEntries(
		Object.entries(initialFrontmatter).map(([path, frontmatter]) => [path, { ...frontmatter }]),
	);
	const app = {
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: frontmatterByPath[file.path] }),
		},
		fileManager: {
			processFrontMatter: async (
				file: TFile,
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const next = frontmatterByPath[file.path] ?? {};
				frontmatterByPath[file.path] = next;
				updater(next);
			},
		},
	} as unknown as App;

	return { app, frontmatterByPath };
}
