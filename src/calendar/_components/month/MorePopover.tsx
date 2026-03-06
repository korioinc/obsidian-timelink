import { canMoveEvent } from '../../../shared/event/event-sync';
import type { EventLocation } from '../../../shared/event/types';
import type { EventSegment } from '../../types';
import { AllDayEventContent } from '../common/AllDayEventContent';

export const MorePopover = ({
	moreMenu,
	moreMenuEvents,
	dayGridRef,
	onClose,
	onEventClick,
	onDragStartFromPopover,
	onDragEnd,
	onToggleCompleted,
	DEFAULT_EVENT_COLOR,
	normalizeEventColor,
}: {
	moreMenu: { dateKey: string } | null;
	moreMenuEvents: Array<{ segment: EventSegment; location: EventLocation }>;
	dayGridRef: { current: HTMLDivElement | null };
	onClose: () => void;
	onEventClick: (segment: EventSegment) => void;
	onDragStartFromPopover: (event: DragEvent, segment: EventSegment) => void;
	onDragEnd: () => void;
	onToggleCompleted: (segment: EventSegment) => void;
	DEFAULT_EVENT_COLOR: string;
	normalizeEventColor: (color?: string | null) => string | null;
}) => {
	if (!moreMenu) return null;
	return (
		<div className="pointer-events-none absolute inset-0 z-[60]">
			{(() => {
				const cell = dayGridRef.current?.querySelector(
					`[data-date-key="${moreMenu.dateKey}"]`,
				) as HTMLElement | null;
				if (!cell) return null;
				const cellRect = cell.getBoundingClientRect();
				const gridRect = dayGridRef.current?.getBoundingClientRect();
				if (!gridRect) return null;
				const left = cellRect.left - gridRect.left;
				const top = cellRect.top - gridRect.top;
				const width = cellRect.width * 1.4;
				return (
					<div
						className="pointer-events-auto absolute rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-4 text-[color:var(--text-normal)] shadow-xl"
						style={{
							width: `${width}px`,
							left: `${left}px`,
							top: `${top}px`,
						}}
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-2 flex items-center justify-between">
							<div className="text-sm font-semibold">{moreMenu.dateKey}</div>
							<button
								type="button"
								className="text-[14px] text-[color:var(--text-muted)]"
								onClick={onClose}
							>
								×
							</button>
						</div>
						<div className="flex flex-col gap-[2px]">
							{moreMenuEvents.map(({ segment, location }, index) => {
								const eventColor = normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR;
								const popoverSegment = { ...segment, location };
								return (
									<div
										key={`${segment.event.id ?? segment.event.title}-${index}`}
										className={`group relative h-[20px] cursor-pointer truncate rounded-md px-2 py-0.5 text-[11px] leading-tight font-semibold text-[color:var(--text-on-accent)] ${
											segment.event.completed ? 'opacity-60' : ''
										}`}
										draggable={canMoveEvent(segment.event)}
										style={{
											backgroundColor: eventColor,
											border: `1px solid ${eventColor}`,
										}}
										onPointerDown={(event) => {
											event.stopPropagation();
										}}
										onDragStart={(event) => {
											event.stopPropagation();
											onDragStartFromPopover(event, popoverSegment);
										}}
										onDragEnd={(event) => {
											event.stopPropagation();
											onDragEnd();
										}}
										onClick={(event) => {
											event.stopPropagation();
											onEventClick({
												id: popoverSegment.event.id ?? '',
												event: popoverSegment.event,
												location,
												start: popoverSegment.start,
												end: popoverSegment.end,
												span: popoverSegment.span,
												startIndex: popoverSegment.startIndex,
												endIndex: popoverSegment.endIndex,
											});
										}}
									>
										<AllDayEventContent
											segment={popoverSegment}
											onToggleCompleted={onToggleCompleted}
											containerClassName="inline-flex items-center gap-[1px]"
											checkboxClassName="m-0 h-[10px] w-[10px] -translate-y-[1px] cursor-pointer border-2 p-0"
											checkboxStyle={{
												borderColor: '#ffffff',
												backgroundColor: segment.event.completed ? '#22c55e' : 'transparent',
											}}
										/>
									</div>
								);
							})}
						</div>
					</div>
				);
			})()}
		</div>
	);
};
