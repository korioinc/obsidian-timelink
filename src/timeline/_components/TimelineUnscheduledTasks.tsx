import type { EventSegment } from '../../calendar/types';
import {
	DEFAULT_EVENT_COLOR,
	normalizeEventColor,
} from '../../calendar/utils/month-calendar-utils';
import type { JSX } from 'preact';

type TimelineUnscheduledTasksProps = {
	tasks: EventSegment[];
	isOpen: boolean;
	onToggle: () => void;
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
};

export const TimelineUnscheduledTasks = ({
	tasks,
	isOpen,
	onToggle,
	onEventClick,
	onToggleCompleted,
}: TimelineUnscheduledTasksProps): JSX.Element => {
	const count = tasks.length;
	return (
		<div className="bg-[var(--background-primary)]">
			<div
				className="flex cursor-pointer items-center justify-between px-3 py-2 text-[12px] text-[color:var(--text-muted)]"
				role="button"
				tabIndex={0}
				onClick={onToggle}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						onToggle();
					}
				}}
			>
				<div className="flex items-center gap-2">
					<span className="text-[12px]">{isOpen ? '▾' : '▸'}</span>
					<span className="font-semibold text-[color:var(--text-normal)]">
						Unscheduled tasks ({count})
					</span>
				</div>
			</div>
			{isOpen ? (
				<div className="flex flex-col gap-1 px-3 pb-2">
					{count === 0 ? (
						<div className="text-[11px] text-[color:var(--text-muted)]">No unscheduled tasks.</div>
					) : (
						tasks.map((segment) => {
							const title = segment.event.title?.trim() || 'Untitled';
							const eventColor = normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR;
							const isTaskEvent = Boolean(segment.event.taskEvent);
							return (
								<div
									key={`unscheduled-${segment.id}`}
									className={`flex w-full cursor-pointer items-center gap-0.5 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-2 py-1 text-[12px] font-semibold text-[color:var(--text-on-accent)] ${
										segment.event.completed ? 'opacity-60' : ''
									}`}
									onPointerDown={(event) => {
										event.stopPropagation();
									}}
									onClick={(event) => {
										event.stopPropagation();
										if (event.target instanceof HTMLInputElement) {
											return;
										}
										onEventClick(segment);
									}}
									role="button"
									tabIndex={0}
									style={{
										borderColor: eventColor,
										backgroundColor: eventColor,
									}}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											onEventClick(segment);
										}
									}}
								>
									{isTaskEvent ? (
										<input
											type="checkbox"
											checked={Boolean(segment.event.completed)}
											title={segment.event.completed ? 'Mark incomplete' : 'Mark complete'}
											className="m-0 h-[10px] w-[10px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
											onPointerDown={(event) => event.stopPropagation()}
											onClick={(event) => event.stopPropagation()}
											onChange={(event) => {
												event.stopPropagation();
												onToggleCompleted(segment);
											}}
										/>
									) : null}
									<span
										className={`min-w-0 flex-1 truncate ${
											segment.event.completed ? 'line-through' : ''
										}`}
									>
										{title}
									</span>
								</div>
							);
						})
					)}
				</div>
			) : null}
		</div>
	);
};
