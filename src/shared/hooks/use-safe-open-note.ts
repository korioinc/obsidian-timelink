import { useCallback } from 'preact/hooks';

export const useSafeOpenNote = (
	onOpenNote: (path: string) => Promise<void> | void,
	notice: (message: string) => void,
) => {
	return useCallback(
		(path: string) => {
			Promise.resolve(onOpenNote(path)).catch((error) => {
				console.error('Failed to open the note', error);
				notice('Failed to open the note.');
			});
		},
		[notice, onOpenNote],
	);
};
