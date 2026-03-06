export type GanttTooltipPlacement = 'above' | 'below';

export const resolveGanttTooltipPlacement = (rowIndex: number): GanttTooltipPlacement =>
	rowIndex === 0 ? 'below' : 'above';
