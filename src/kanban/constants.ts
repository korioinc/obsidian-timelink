export const KANBAN_VIEW_TYPE = 'timelink-kanban';
export const KANBAN_ICON = 'lucide-trello';

export const DEFAULT_LANES: string[] = ['Todo', 'Doing', 'Done'];

export const BOARD_VISIBILITY_SETTINGS = [
	{
		key: 'show-board-color',
		defaultValue: true,
		name: 'Board color indicator button',
		description: 'Show the board color indicator in the board header.',
	},
	{
		key: 'show-add-list',
		defaultValue: true,
		name: 'Add a list action button',
		description: 'Show the add a list action in the board header.',
	},
	{
		key: 'show-view-as-markdown',
		defaultValue: true,
		name: 'Open as Markdown button',
		description: 'Show the open as Markdown action in the board header.',
	},
	{
		key: 'show-set-view',
		defaultValue: true,
		name: 'Board view button',
		description: 'Show the board view mode selector in the header.',
	},
] as const;
