import { GANTT_VIEW_ICON } from '../../gantt/constants';
import { KANBAN_LIST_VIEW_ICON } from '../../kanban-list/constants';
import { KANBAN_ICON } from '../constants';

type RibbonHost = {
	addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement;
};

type KanbanRibbonActions = {
	onCreateBoard: () => void;
	onOpenBoardList: () => void;
	onOpenGantt: () => void;
};

export class KanbanRibbonController {
	private createBoardIcon: HTMLElement | null = null;
	private boardListIcon: HTMLElement | null = null;
	private ganttIcon: HTMLElement | null = null;

	constructor(
		private readonly host: RibbonHost,
		private readonly actions: KanbanRibbonActions,
	) {}

	show(): void {
		this.createBoardIcon ??= this.host.addRibbonIcon(
			KANBAN_ICON,
			'Create kanban board',
			this.actions.onCreateBoard,
		);
		this.boardListIcon ??= this.host.addRibbonIcon(
			KANBAN_LIST_VIEW_ICON,
			'Open kanban list',
			this.actions.onOpenBoardList,
		);
		this.ganttIcon ??= this.host.addRibbonIcon(
			GANTT_VIEW_ICON,
			'Open gantt',
			this.actions.onOpenGantt,
		);
	}

	hide(): void {
		this.createBoardIcon?.remove();
		this.boardListIcon?.remove();
		this.ganttIcon?.remove();
		this.createBoardIcon = null;
		this.boardListIcon = null;
		this.ganttIcon = null;
	}
}
