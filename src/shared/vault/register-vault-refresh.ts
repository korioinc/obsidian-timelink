import type { TAbstractFile, Vault } from 'obsidian';

export const registerVaultRefresh = (
	vault: Vault,
	shouldRefresh: (file: TAbstractFile, oldPath?: string) => boolean,
	onReload: () => void,
): (() => void) => {
	const onVaultChange = (file: TAbstractFile) => {
		if (!shouldRefresh(file)) return;
		onReload();
	};
	const onVaultRename = (file: TAbstractFile, oldPath: string) => {
		if (!shouldRefresh(file, oldPath)) return;
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
