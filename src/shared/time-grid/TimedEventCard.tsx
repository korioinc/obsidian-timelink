import type { SingleColumnTimedEventRenderEntry } from '../event/timed-visual-model';
import type { EventSegment, TimedEventPlacement } from '../event/types';

export type TimedEventCardVariant = 'calendar' | 'timeline';

type TimedEventCardProps = {
	placement: TimedEventPlacement;
	visualTop: number;
	visualHeight: number;
	left: number;
	width: number;
	eventColor: string;
	isDraggingEvent: boolean;
	draggable: boolean;
	startLabel: string;
	endLabel: string;
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	onTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	onTimedEventDragStart: (event: DragEvent, segment: EventSegment) => void;
	onTimedEventDragEnd: () => void;
	variant?: TimedEventCardVariant;
};

const TIMED_EVENT_CHECKBOX_CLASS_NAME =
	'm-0 h-[10px] w-[10px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]';

export const TimedEventCard = ({
	placement,
	visualTop,
	visualHeight,
	left,
	width,
	eventColor,
	isDraggingEvent,
	draggable,
	startLabel,
	endLabel,
	onEventClick,
	onToggleCompleted,
	onTimedResizeStart,
	onTimedEventDragStart,
	onTimedEventDragEnd,
	variant = 'calendar',
}: TimedEventCardProps) => {
	const isTimeline = variant === 'timeline';
	return (
		<div
			className={`group absolute z-20 cursor-pointer overflow-hidden rounded-md border text-[11px] font-semibold text-[color:var(--text-on-accent)] ${
				isTimeline ? 'w-full' : ''
			} ${placement.segment.event.completed ? 'opacity-60' : ''}`}
			style={{
				top: `${visualTop}px`,
				left: `calc(${left}% + 2px)`,
				width: `calc(${width}% - 4px)`,
				height: `${visualHeight}px`,
				backgroundColor: eventColor,
				borderColor: eventColor,
				opacity: !isTimeline && isDraggingEvent ? 0 : undefined,
				overflow: isDraggingEvent ? 'hidden' : undefined,
			}}
			draggable={draggable}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
			onDragStart={(event) => {
				event.stopPropagation();
				onTimedEventDragStart(event, placement.segment);
			}}
			onDragEnd={(event) => {
				event.stopPropagation();
				onTimedEventDragEnd();
			}}
			onClick={(event) => {
				event.stopPropagation();
				if (isTimeline && event.target instanceof HTMLInputElement) return;
				onEventClick(placement.segment);
			}}
		>
			<div className={`flex items-center px-2 py-1 ${isTimeline ? 'gap-0.5' : 'gap-1'}`}>
				{placement.segment.event.taskEvent ? (
					<input
						type="checkbox"
						checked={Boolean(placement.segment.event.completed)}
						className={TIMED_EVENT_CHECKBOX_CLASS_NAME}
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => event.stopPropagation()}
						onChange={(event) => {
							event.stopPropagation();
							if (!isTimeline) {
								event.preventDefault();
							}
							onToggleCompleted(placement.segment);
						}}
					/>
				) : null}
				{isTimeline ? (
					<span className="text-[10px] opacity-90">
						{startLabel} - {endLabel}
					</span>
				) : (
					<span className="truncate">{placement.segment.event.title}</span>
				)}
			</div>
			{isTimeline ? (
				<div className="px-2 pb-1 leading-tight">
					<span
						className={`break-words whitespace-normal ${
							placement.segment.event.completed ? 'line-through' : ''
						}`}
					>
						{placement.segment.event.title}
					</span>
				</div>
			) : (
				<div className="px-2 text-[10px] opacity-90">
					{startLabel} - {endLabel}
				</div>
			)}
			<span
				className="absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize"
				onPointerDown={(event) => onTimedResizeStart(placement.segment, event)}
				title="Resize"
			/>
		</div>
	);
};

type RenderTimedEventCardNodeParams = {
	entry: SingleColumnTimedEventRenderEntry;
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	onTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	onTimedEventDragStart: (event: DragEvent, segment: EventSegment) => void;
	onTimedEventDragEnd: () => void;
	variant?: TimedEventCardVariant;
};

export const renderTimedEventCardNode = ({
	entry,
	onEventClick,
	onToggleCompleted,
	onTimedResizeStart,
	onTimedEventDragStart,
	onTimedEventDragEnd,
	variant,
}: RenderTimedEventCardNodeParams) => {
	const { placement, model } = entry;
	return (
		<TimedEventCard
			key={`timed-${placement.segment.id}`}
			placement={placement}
			visualTop={model.visualTop}
			visualHeight={model.visualHeight}
			left={model.left}
			width={model.width}
			eventColor={model.eventColor}
			isDraggingEvent={model.isDraggingEvent}
			draggable={model.draggable}
			startLabel={model.startLabel}
			endLabel={model.endLabel}
			onEventClick={onEventClick}
			onToggleCompleted={onToggleCompleted}
			onTimedResizeStart={onTimedResizeStart}
			onTimedEventDragStart={onTimedEventDragStart}
			onTimedEventDragEnd={onTimedEventDragEnd}
			variant={variant}
		/>
	);
};
