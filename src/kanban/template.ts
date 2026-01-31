import { DEFAULT_LANES, KANBAN_FRONTMATTER_KEY, KANBAN_FRONTMATTER_VALUE } from './constants';

export interface KanbanBoardTemplate {
	title: string;
	lanes?: string[];
}

export function buildKanbanBoardMarkdown(template: KanbanBoardTemplate): string {
	const lanes = template.lanes?.length ? template.lanes : DEFAULT_LANES;
	const frontmatter = [
		'---',
		`${KANBAN_FRONTMATTER_KEY}: ${KANBAN_FRONTMATTER_VALUE}`,
		'---',
		'',
	].join('\n');

	const body = lanes
		.map((lane) => [`## ${lane}`, '', '- [ ] Sample card', ''].join('\n'))
		.join('\n');

	return `${frontmatter}\n${body}`.trimEnd() + '\n';
}
