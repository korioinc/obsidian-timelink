import type { EventSegment } from '../shared/event/types';
import type { EventDayViewProps } from '../shared/event/view-types';
import type { SingleColumnTimedViewProps } from '../shared/time-grid/single-column-view-types';
import type { AllDayEventInteractionHandlers } from './all-day-interaction-types';

export type {
	CalendarEvent,
	CreateEventState,
	EventModalState,
	EventSegment,
	TimeSelectionRange,
	TimeSelectionState,
	TimedEventPlacement,
} from '../shared/event/types';

export type CalendarViewProps = EventDayViewProps;

export type MonthCalendarProps = CalendarViewProps;

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';
export type DayWeekMode = 'day' | 'week';

export const deriveSelectionEndIndexForMode = (mode: DayWeekMode) => (mode === 'day' ? 0 : 6);

export const deriveTimedDatesForMode = (
	mode: DayWeekMode,
	grid: Array<{ date: Date }>,
	firstCell: { date: Date },
) => (mode === 'day' ? [firstCell.date] : grid.map((cell) => cell.date));

export type CalendarHeaderView = {
	value: CalendarViewMode;
	label: string;
};

export type WeekDayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type WeekEventPlacementBase = {
	segment: EventSegment;
	weekRow: number;
	columnStart: number;
	spanInWeek: number;
	isSpanStart: boolean;
	isSpanEnd: boolean;
	isActualEnd: boolean;
};

export type WeekMultiDayPlacement = WeekEventPlacementBase;

export type WeekSingleDayPlacement = WeekEventPlacementBase & {
	dayOffset: WeekDayKey;
	cellIndex: number;
};

export type WeekEventLayout = {
	rowCapacity: number;
	weekRowCount: number;
	multiDayPlacements: WeekMultiDayPlacement[];
	singleDayPlacements: WeekSingleDayPlacement[];
	hiddenCountsByDay: Record<WeekDayKey, number>;
};

export type WeekHeaderProps = {
	weekCells: Array<{ date: Date }>;
	isToday: (date: Date) => boolean;
};

export type WeekAllDaySectionProps = AllDayEventInteractionHandlers & {
	weekCells: { key: string; date: Date; inMonth: boolean }[];
	eventRows: EventSegment[][];
	anchorDateKey: string | null;
	isSelecting: boolean;
	draggingId: string | null;
	dragRange: { start: string; end: string } | null;
	resizeRange: { start: string; end: string } | null;
	dragHoverIndex: number | null;
	indexByDateKey: Map<string, number>;
	gridByIndex: { key: string; date: Date; inMonth: boolean }[];
	draggingColor?: string;
	resizingColor?: string;
	selectionSpan: { columnStart: number; span: number } | null;
	DEFAULT_EVENT_COLOR: string;
	normalizeEventColor: (color?: string | null) => string | null;
	onDragOverCapture: (event: DragEvent) => void;
	onDragEnterCapture: (event: DragEvent) => void;
	onDropCapture: (event: DragEvent) => void;
	gridRef: { current: HTMLDivElement | null };
};

export type WeekTimeGridProps = Omit<SingleColumnTimedViewProps, 'date'> & {
	weekCells: { date: Date }[];
	todayIndex: number;
};
