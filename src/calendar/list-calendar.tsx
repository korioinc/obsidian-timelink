import { buildEventRowsWithLocations, deriveGridByIndex } from './events/derivers';
import {
	handleEventClickFactory,
	handleModalSaveFactory,
	handleToggleCompletedFactory,
} from './events/modal';
import type { CalendarViewProps, EventModalState, EventSegment } from './types';
import { useCalendarModals } from './ui';
import { buildWeekGrid } from './utils/date-grid';
import {
	compareDateKey,
	DEFAULT_EVENT_COLOR,
	normalizeEventColor,
} from './utils/month-calendar-utils';
import { formatTime, isTimedEvent, toMinutes } from './utils/week-timed-events';
import { Notice } from 'obsidian';
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

const formatDayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long' });

const formatDateLabel = (date: Date) =>
	date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

const getSortMinutes = (segment: EventSegment) => {
	if (!isTimedEvent(segment.event)) return Number.POSITIVE_INFINITY;
	return toMinutes(segment.event.startTime) ?? Number.POSITIVE_INFINITY;
};

const isAllDayEvent = (segment: EventSegment) =>
	segment.event.allDay || !isTimedEvent(segment.event);

export const ListCalendar = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	initialDate,
}: CalendarViewProps): JSX.Element => {
	const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
	const currentDateRef = useRef(currentDate);
	const [modal, setModal] = useState<EventModalState | null>(null);

	const notice = (message: string) => {
		new Notice(message);
	};

	useEffect(() => {
		if (initialDate && initialDate.getTime() !== currentDateRef.current.getTime()) {
			currentDateRef.current = initialDate;
			setCurrentDate(initialDate);
		}
	}, [initialDate]);

	const weekGrid = useMemo(() => buildWeekGrid(currentDate, 0), [currentDate]);
	const gridByIndex = useMemo(() => deriveGridByIndex(weekGrid), [weekGrid]);
	const eventRows = useMemo(
		() => buildEventRowsWithLocations(events, weekGrid),
		[events, weekGrid],
	);
	const flattened = useMemo(() => eventRows.flat(), [eventRows]);

	const handleToggleCompleted = useMemo(
		() => handleToggleCompletedFactory(onSaveEvent),
		[onSaveEvent],
	);

	const handleEventClick = useMemo(
		() =>
			handleEventClickFactory(
				(next) => setModal(next),
				() => {},
				() => false,
				{ current: false },
			),
		[setModal],
	);

	const handleModalSave = useMemo(
		() => handleModalSaveFactory(() => modal, onSaveEvent, setModal, notice),
		[modal, onSaveEvent],
	);

	const handleModalDelete = () => {
		if (!modal) return;
		onDeleteEvent([modal.segment.event, modal.segment.location]);
		setModal(null);
	};

	const handleOpenNote = () => {
		if (!modal?.segment.location.file.path) {
			notice('Unable to find the note path.');
			return;
		}
		onOpenNote(modal.segment.location.file.path);
	};

	const handleCloseEditModal = () => {
		setModal(null);
	};

	useCalendarModals({
		app,
		modal,
		createModal: null,
		onEditSave: handleModalSave,
		onEditDelete: handleModalDelete,
		onOpenNote: handleOpenNote,
		onCloseEdit: handleCloseEditModal,
		onCreateSave: () => {},
		onCloseCreate: () => {},
	});

	const sections = useMemo(() => {
		return gridByIndex.map((cell) => {
			const dayKey = cell.key;
			const daySegments = flattened.filter(
				(segment) =>
					compareDateKey(dayKey, segment.start) >= 0 && compareDateKey(dayKey, segment.end) <= 0,
			);
			const allDay = daySegments.filter((segment) => isAllDayEvent(segment));
			const timed = daySegments
				.filter((segment) => !isAllDayEvent(segment))
				.sort((a, b) => getSortMinutes(a) - getSortMinutes(b));
			return {
				date: cell.date,
				key: dayKey,
				allDay,
				timed,
			};
		});
	}, [flattened, gridByIndex]);

	return (
		<div className="flex h-full w-full flex-col overflow-x-hidden">
			<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline outline-1 outline-offset-[-1px] outline-[color:var(--background-modifier-border)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent">
				{sections.map((section) => (
					<div key={section.key} className="border-b border-[var(--background-modifier-border)]">
						<div className="flex items-center justify-between bg-[var(--background-secondary)] px-4 py-2 text-[12px] font-semibold text-[color:var(--text-muted)]">
							<span>{formatDayLabel(section.date)}</span>
							<span className="text-[color:var(--text-muted)]">
								{formatDateLabel(section.date)}
							</span>
						</div>
						<div className="flex flex-col">
							{section.allDay.length === 0 && section.timed.length === 0 ? (
								<div className="px-4 py-3 text-[12px] text-[color:var(--text-faint)]">
									No events
								</div>
							) : null}
							{section.allDay.map((segment, index) => {
								const color = normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR;
								return (
									<div
										key={`all-day-${segment.id}-${index}`}
										className="flex items-center gap-2 px-4 py-2 text-[13px] text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)]"
										onClick={() => handleEventClick(segment)}
									>
										<span className="w-[90px] shrink-0 text-[12px] text-[color:var(--text-muted)]">
											all-day
										</span>
										<span
											className="inline-flex h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: color }}
										/>
										{segment.event.taskEvent ? (
											<input
												type="checkbox"
												checked={Boolean(segment.event.completed)}
												className="m-0 h-[12px] w-[12px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
												onClick={(event) => event.stopPropagation()}
												onChange={(event) => {
													event.stopPropagation();
													event.preventDefault();
													handleToggleCompleted(segment);
												}}
											/>
										) : null}
										<span className={`${segment.event.completed ? 'line-through opacity-60' : ''}`}>
											{segment.event.title}
										</span>
									</div>
								);
							})}
							{section.timed.map((segment, index) => {
								const color = normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR;
								const startMinutes = toMinutes(segment.event.startTime) ?? 0;
								const endMinutes = toMinutes(segment.event.endTime) ?? startMinutes;
								const startLabel = formatTime(startMinutes);
								const endLabel = formatTime(endMinutes);
								return (
									<div
										key={`timed-${segment.id}-${index}`}
										className="flex items-center gap-2 px-4 py-2 text-[13px] text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)]"
										onClick={() => handleEventClick(segment)}
									>
										<span className="w-[90px] shrink-0 text-[12px] text-[color:var(--text-muted)]">
											{startLabel} - {endLabel}
										</span>
										<span
											className="inline-flex h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: color }}
										/>
										{segment.event.taskEvent ? (
											<input
												type="checkbox"
												checked={Boolean(segment.event.completed)}
												className="m-0 h-[12px] w-[12px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
												onClick={(event) => event.stopPropagation()}
												onChange={(event) => {
													event.stopPropagation();
													event.preventDefault();
													handleToggleCompleted(segment);
												}}
											/>
										) : null}
										<span className={`${segment.event.completed ? 'line-through opacity-60' : ''}`}>
											{segment.event.title}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
