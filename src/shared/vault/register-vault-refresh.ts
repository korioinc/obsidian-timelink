import type { TAbstractFile, Vault } from 'obsidian';

const isAbstractFile = (value: unknown): value is TAbstractFile =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as { path?: unknown }).path === 'string';

export const registerVaultRefresh = (
	vault: Vault,
	shouldRefresh: (file: TAbstractFile, oldPath?: string) => boolean,
	onReload: () => void,
): (() => void) => {
	const onVaultChange = (...data: unknown[]) => {
		const file = data[0];
		if (!isAbstractFile(file)) return;
		if (!shouldRefresh(file)) return;
		onReload();
	};
	const onVaultRename = (...data: unknown[]) => {
		const [file, oldPath] = data;
		if (!isAbstractFile(file)) return;
		if (!shouldRefresh(file, typeof oldPath === 'string' ? oldPath : undefined)) return;
		onReload();
	};

	vault.on('create', onVaultChange);
	vault.on('modify', onVaultChange);
	vault.on('delete', onVaultChange);
	vault.on('rename', onVaultRename);

	return () => {
		vault.off('create', onVaultChange);
		vault.off('modify', onVaultChange);
		vault.off('delete', onVaultChange);
		vault.off('rename', onVaultRename);
	};
};
