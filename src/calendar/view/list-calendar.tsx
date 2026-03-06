import { useSyncedCurrentDate } from '../../shared/hooks/use-date-sync';
import { useEventInteractionHandlers } from '../../shared/hooks/use-event-interaction-handlers';
import { ListEventRow } from '../_components/list/ListEventRow';
import { useListSections } from '../hooks/use-list-sections';
import type { CalendarViewProps, CreateEventState, EventModalState } from '../types';
import type { JSX } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';

const formatDayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long' });

const formatDateLabel = (date: Date) =>
	date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

export const ListCalendar = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	initialDate,
	onCreateEvent,
}: CalendarViewProps): JSX.Element => {
	const { currentDate } = useSyncedCurrentDate(initialDate);
	const [modal, setModal] = useState<EventModalState | null>(null);
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	const isResizingRef = useRef(false);
	const sections = useListSections(events, currentDate);

	const endSelection = useCallback(() => undefined, []);
	const { handleEventClick, handleToggleCompleted } = useEventInteractionHandlers({
		app,
		modal,
		setModal,
		createModal,
		setCreateModal,
		selectionIsSelecting: false,
		endSelection,
		isResizingRef,
		onSaveEvent,
		onCreateEvent,
		onDeleteEvent,
		onOpenNote,
	});

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
							{section.allDay.map((segment, index) => (
								<ListEventRow
									key={`all-day-${segment.id}-${index}`}
									segment={segment}
									kind="all-day"
									onClick={handleEventClick}
									onToggleCompleted={handleToggleCompleted}
								/>
							))}
							{section.timed.map((segment, index) => (
								<ListEventRow
									key={`timed-${segment.id}-${index}`}
									segment={segment}
									kind="timed"
									onClick={handleEventClick}
									onToggleCompleted={handleToggleCompleted}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
