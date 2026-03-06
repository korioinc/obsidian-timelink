import { canMoveEvent } from '../../../shared/event/event-sync';
import { DEFAULT_EVENT_COLOR, normalizeEventColor } from '../../../shared/event/model-utils';
import type { AllDayEventBarInteractionHandlers } from '../../all-day-interaction-types';
import type { WeekMultiDayPlacement, WeekSingleDayPlacement } from '../../types';
import { AllDayEventContent } from '../common/AllDayEventContent';

type AllDayPlacement = WeekMultiDayPlacement | WeekSingleDayPlacement;

type AllDayEventBarProps = AllDayEventBarInteractionHandlers & {
	placement: AllDayPlacement;
	draggingId: string | null;
	marginClassName?: string;
	checkboxClassName?: string;
	checkboxStyle?: Record<string, string | number>;
};

const shouldRenderContent = (placement: AllDayPlacement) => {
	if (placement.spanInWeek <= 1) return true;
	return placement.isSpanStart || placement.columnStart === 1;
};

const getEdgeRadiusClass = (placement: AllDayPlacement) => {
	if (placement.spanInWeek <= 1) return 'rounded-md';
	const hasLeftEdge = placement.isSpanStart;
	const hasRightEdge = placement.isSpanEnd;
	if (hasLeftEdge && hasRightEdge) return 'rounded-md';
	if (hasLeftEdge) return 'rounded-l-md';
	if (hasRightEdge) return 'rounded-r-md';
	return '';
};

export const AllDayEventBar = ({
	placement,
	draggingId,
	onDragStart,
	onDragEnd,
	onEventClick,
	onResizeStart,
	onToggleCompleted,
	marginClassName = '',
	checkboxClassName = 'm-0 h-[10px] w-[10px] -translate-y-[1px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]',
	checkboxStyle,
}: AllDayEventBarProps) => {
	const eventColor = normalizeEventColor(placement.segment.event.color) ?? DEFAULT_EVENT_COLOR;
	const isSingleDay = placement.segment.span <= 1;
	const showResizeHandle = isSingleDay || placement.isActualEnd;
	const edgeRadiusClass = getEdgeRadiusClass(placement);
	const renderContent = shouldRenderContent(placement);

	return (
		<div
			className={`group pointer-events-auto relative cursor-pointer truncate border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] py-0.5 text-[11px] leading-tight font-semibold text-[color:var(--text-on-accent)] ${edgeRadiusClass} ${marginClassName} ${
				draggingId === placement.segment.id ? 'opacity-0' : ''
			} ${placement.segment.event.completed ? 'opacity-60' : ''}`}
			draggable={canMoveEvent(placement.segment.event)}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
			onDragStart={(event) => onDragStart(event, placement.segment)}
			onDragEnd={onDragEnd}
			onClick={(event) => {
				event.stopPropagation();
				onEventClick(placement.segment);
			}}
			style={{
				gridRow: placement.weekRow + 1,
				gridColumn: `${placement.columnStart} / span ${placement.spanInWeek}`,
				borderColor: eventColor,
				backgroundColor: eventColor,
			}}
		>
			{renderContent ? (
				<AllDayEventContent
					segment={placement.segment}
					onToggleCompleted={onToggleCompleted}
					containerClassName="ml-1 inline-flex items-center gap-[1px]"
					checkboxClassName={checkboxClassName}
					checkboxStyle={checkboxStyle}
				/>
			) : null}
			{showResizeHandle ? (
				<span
					className={`pointer-events-auto absolute top-0 right-0 h-full cursor-col-resize opacity-0 ${
						isSingleDay ? 'w-3' : 'w-2'
					}`}
					title="Resize"
					onPointerDown={(event) => {
						event.stopPropagation();
						event.preventDefault();
						onResizeStart(placement.segment);
					}}
				/>
			) : null}
		</div>
	);
};
