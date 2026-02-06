export interface KanbanListItem {
	path: string;
	basename: string;
	folderPath: string;
	folderDepth: number;
	mtime: number;
	kanbanColor?: string;
}
