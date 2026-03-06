type ParentPathLike = {
	parent?: {
		path?: string | null;
	} | null;
};

export const getFolderPath = (file: ParentPathLike): string => file.parent?.path ?? '';

export const getFolderDepth = (folderPath: string): number => {
	if (!folderPath.trim()) return 0;
	return folderPath.split('/').filter(Boolean).length;
};

const getParentPathFromPath = (path: string | null | undefined): string => {
	if (!path?.trim()) return '';
	const normalized = path.trim().replace(/\/+$/g, '');
	const slashIndex = normalized.lastIndexOf('/');
	if (slashIndex === -1) return '';
	return normalized.slice(0, slashIndex);
};

export const isWithinDepth = (file: ParentPathLike, maxDepth: number): boolean => {
	return getFolderDepth(getFolderPath(file)) <= maxDepth;
};

export const isPathWithinDepth = (path: string | null | undefined, maxDepth: number): boolean => {
	if (!path?.trim()) return false;
	return getFolderDepth(getParentPathFromPath(path)) <= maxDepth;
};
