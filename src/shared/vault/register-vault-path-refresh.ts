import { registerVaultRefresh } from './register-vault-refresh';
import type { Vault } from 'obsidian';

type DirectoryProvider = string | (() => string);

const readDirectory = (directory: DirectoryProvider): string =>
	typeof directory === 'function' ? directory() : directory;

const normalizeVaultPath = (value: string): string =>
	value
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/|\/$/g, '');

export const isPathInDirectory = (path: string | null | undefined, directory: string): boolean => {
	if (!path) return false;
	const normalizedPath = normalizeVaultPath(path);
	const normalizedDirectory = normalizeVaultPath(directory);
	if (!normalizedDirectory) return false;
	return (
		normalizedPath === normalizedDirectory || normalizedPath.startsWith(`${normalizedDirectory}/`)
	);
};

export const registerVaultPathRefresh = (
	vault: Vault,
	directory: DirectoryProvider,
	onReload: () => void,
): (() => void) => {
	return registerVaultRefresh(
		vault,
		(file, oldPath) => {
			const currentDirectory = readDirectory(directory);
			return (
				isPathInDirectory(file.path, currentDirectory) ||
				isPathInDirectory(oldPath, currentDirectory)
			);
		},
		onReload,
	);
};
