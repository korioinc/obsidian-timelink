export type CreateBoardAndOpenResult<TFile> =
	| { file: TFile; opened: true; openError: null }
	| { file: TFile; opened: false; openError: unknown };

export const createBoardAndAttemptOpen = async <TFile>(
	createBoard: () => Promise<TFile>,
	openBoard: (file: TFile) => Promise<void>,
): Promise<CreateBoardAndOpenResult<TFile>> => {
	const file = await createBoard();
	try {
		await openBoard(file);
		return { file, opened: true, openError: null };
	} catch (openError) {
		return { file, opened: false, openError };
	}
};
