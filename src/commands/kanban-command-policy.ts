import type { resolveKanbanOpenDecision } from '../kanban/services/board-open-policy';

type KanbanOpenDecision = ReturnType<typeof resolveKanbanOpenDecision>;

export const canOfferOpenActiveKanbanBoard = (decision: KanbanOpenDecision): boolean =>
	decision !== 'deny';
