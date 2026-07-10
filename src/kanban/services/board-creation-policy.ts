type KanbanBoardCreationResolution = {
	kind: 'create';
	title: string;
	path: string;
};

const normalizeBoardTitle = (title: string): string => {
	const normalized = title.trim();
	if (!normalized) {
		throw new Error('Please enter a board name.');
	}
	if (normalized === '.' || normalized === '..' || /[\\/]/.test(normalized)) {
		throw new Error('Board names cannot be "." or ".." and cannot contain "/" or "\\".');
	}
	return normalized;
};

const normalizeFolderPath = (folderPath: string | undefined): string => {
	const rawPath = folderPath?.trim();
	if (!rawPath) return '';
	const slashPath = rawPath.replace(/\\/g, '/');
	if (/^\/+$/u.test(slashPath)) return '';
	if (slashPath.startsWith('/')) {
		throw new Error('The board folder must be inside the vault.');
	}
	const segments = slashPath.split('/').filter(Boolean);
	if (segments.some((segment) => segment === '.' || segment === '..')) {
		throw new Error('The board folder must be inside the vault.');
	}
	return segments.join('/');
};

export const resolveKanbanBoardCreation = <T>(
	title: string,
	folderPath: string | undefined,
	findExisting: (path: string) => T | null,
): KanbanBoardCreationResolution => {
	const safeTitle = normalizeBoardTitle(title);
	const filename = `${safeTitle}.md`;
	const basePath = normalizeFolderPath(folderPath);
	const path = basePath ? `${basePath}/${filename}` : filename;
	const existing = findExisting(path);
	if (existing !== null) {
		throw new Error(`A file already exists at "${path}".`);
	}
	return {
		kind: 'create',
		title: safeTitle,
		path,
	};
};
