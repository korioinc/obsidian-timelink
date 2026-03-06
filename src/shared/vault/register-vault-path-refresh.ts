import { registerVaultRefresh } from './register-vault-refresh';
import type { Vault } from 'obsidian';

export const isPathInDirectory = (path: string | null | undefined, directory: string): boolean => {
	if (!path) return false;
	return path === directory || path.startsWith(`${directory}/`);
};

export const registerVaultPathRefresh = (
	vault: Vault,
	directory: string,
	onReload: () => void,
): (() => void) => {
	return registerVaultRefresh(
		vault,
		(file, oldPath) =>
			isPathInDirectory(file.path, directory) || isPathInDirectory(oldPath, directory),
		onReload,
	);
};
