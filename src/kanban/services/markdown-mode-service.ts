import type { WorkspaceLeaf } from 'obsidian';

type KanbanMarkdownMode = 'readonly' | 'editing';

type TrackedMarkdownMode = {
	filePath: string;
	mode: KanbanMarkdownMode;
	token: number;
};

type MarkdownModeTransition = {
	leafId: string;
	token: number;
	previous: TrackedMarkdownMode | null;
};

export class KanbanMarkdownModeTracker {
	private readonly modesByLeafId = new Map<string, TrackedMarkdownMode>();
	private nextToken = 0;

	set(leafId: string, filePath: string, mode: KanbanMarkdownMode): MarkdownModeTransition | null {
		if (!leafId || !filePath) return null;
		const previous = this.modesByLeafId.get(leafId) ?? null;
		this.nextToken += 1;
		this.modesByLeafId.set(leafId, { filePath, mode, token: this.nextToken });
		return { leafId, token: this.nextToken, previous };
	}

	get(leafId: string, filePath: string): KanbanMarkdownMode | undefined {
		const tracked = this.modesByLeafId.get(leafId);
		if (!tracked) return undefined;
		if (tracked.filePath === filePath) return tracked.mode;
		this.modesByLeafId.delete(leafId);
		return undefined;
	}

	clear(leafId: string): void {
		this.modesByLeafId.delete(leafId);
	}

	rollbackIfCurrent(transition: MarkdownModeTransition): void {
		if (this.modesByLeafId.get(transition.leafId)?.token !== transition.token) return;
		if (transition.previous) {
			this.modesByLeafId.set(transition.leafId, transition.previous);
		} else {
			this.modesByLeafId.delete(transition.leafId);
		}
	}

	clearAll(): void {
		this.modesByLeafId.clear();
	}
}

export const openTrackedMarkdownView = async (
	tracker: KanbanMarkdownModeTracker,
	leaf: WorkspaceLeaf,
	options: { readOnly: boolean },
): Promise<void> => {
	const leafId = String((leaf as WorkspaceLeaf & { id?: string }).id ?? '');
	const state = leaf.view?.getState?.() ?? {};
	const filePath = (state as { file?: string }).file;

	const transition =
		leafId && filePath
			? tracker.set(leafId, filePath, options.readOnly ? 'readonly' : 'editing')
			: null;

	try {
		await leaf.setViewState({
			type: 'markdown',
			state: options.readOnly ? { ...state, mode: 'preview' } : state,
		});
	} catch (error) {
		if (transition) tracker.rollbackIfCurrent(transition);
		throw error;
	}
};
