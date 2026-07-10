import type { KanbanBoard } from '../types';

type BoardMutation = (board: KanbanBoard) => KanbanBoard;

type BoardMutationPersistenceContext = {
	getBoard: () => KanbanBoard | null;
	setBoard: (board: KanbanBoard | null) => void;
	persist: () => Promise<void>;
};

export const persistBoardMutation = async (
	context: BoardMutationPersistenceContext,
	mutate: BoardMutation,
): Promise<boolean> => {
	const board = context.getBoard();
	if (!board) return false;
	context.setBoard(mutate(board));
	try {
		await context.persist();
	} catch (error) {
		context.setBoard(board);
		throw error;
	}
	return true;
};
