import { CalendarHeader } from './_components/CalendarHeader';
import type { EditableEventResponse, EventLocation, FullNoteCalendar } from './calendar';
import { DayCalendar } from './day-calendar';
import {
	applyOptimisticMove,
	rollbackOptimisticMove,
	updateEventEntry,
	updateEventLocation,
} from './event-sync';
import { ListCalendar } from './list-calendar';
import { MonthCalendar } from './month-calendar';
import type { CalendarEvent, CalendarViewMode } from './types';
import { formatDayTitle, formatMonthTitle, formatWeekTitle } from './utils/month-calendar-utils';
import { WeekCalendar } from './week-calendar';
import { Notice, type App } from 'obsidian';
import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

const isCalendarPath = (path: string | null | undefined, directory: string): boolean => {
	if (!path) return false;
	return path === directory || path.startsWith(`${directory}/`);
};

const registerCalendarRefresh = (
	app: App,
	calendarDirectory: string,
	onReload: () => void,
): (() => void) => {
	const onVaultChange = (file: { path?: string }) => {
		if (!isCalendarPath(file?.path, calendarDirectory)) return;
		onReload();
	};
	app.vault.on('create', onVaultChange);
	app.vault.on('modify', onVaultChange);
	app.vault.on('delete', onVaultChange);
	app.vault.on('rename', onVaultChange);
	return () => {
		app.vault.off('create', onVaultChange);
		app.vault.off('modify', onVaultChange);
		app.vault.off('delete', onVaultChange);
		app.vault.off('rename', onVaultChange);
	};
};

export { useCalendarModals } from './modal-manager';

type CalendarUIProps = {
	app: App;
	calendar: FullNoteCalendar;
	onOpenNote: (path: string) => void;
};

const CalendarRoot = ({ app, calendar, onOpenNote }: CalendarUIProps) => {
	const [loadError, setLoadError] = useState<string | null>(null);
	const [events, setEvents] = useState<EditableEventResponse[]>([]);
	const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
	const [currentDate, setCurrentDate] = useState(() => new Date());
	const reloadTimerRef = useRef<number | null>(null);
	const suppressReloadUntilRef = useRef(0);

	const calendarDirectory = useMemo(() => calendar.getDirectory(), [calendar]);

	const reloadEvents = useCallback(async () => {
		setLoadError(null);
		try {
			const loaded = await calendar.getEvents();
			setEvents(loaded);
		} catch (error) {
			console.error('Failed to load calendar events', error);
			setLoadError('Failed to load the calendar.');
		}
	}, [calendar]);

	const scheduleReload = useCallback(() => {
		if (reloadTimerRef.current !== null) {
			window.clearTimeout(reloadTimerRef.current);
		}
		reloadTimerRef.current = window.setTimeout(() => {
			reloadTimerRef.current = null;
			void reloadEvents();
		}, 150);
	}, [reloadEvents]);

	const suppressReload = useCallback(
		(ms = 400) => {
			suppressReloadUntilRef.current = Date.now() + ms;
			scheduleReload();
		},
		[scheduleReload],
	);

	const handlePrev = () => {
		const next = new Date(currentDate);
		if (viewMode === 'month') {
			next.setMonth(next.getMonth() - 1);
		} else if (viewMode === 'week' || viewMode === 'list') {
			next.setDate(next.getDate() - 7);
		} else {
			next.setDate(next.getDate() - 1);
		}
		setCurrentDate(next);
	};

	const handleNext = () => {
		const next = new Date(currentDate);
		if (viewMode === 'month') {
			next.setMonth(next.getMonth() + 1);
		} else if (viewMode === 'week' || viewMode === 'list') {
			next.setDate(next.getDate() + 7);
		} else {
			next.setDate(next.getDate() + 1);
		}
		setCurrentDate(next);
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	const updateLocation = useCallback((previous: EventLocation, next: EventLocation) => {
		setEvents((current) => updateEventLocation(current, previous, next));
	}, []);

	const handleSaveEvent = useCallback(
		async (next: EditableEventResponse, previous: EditableEventResponse) => {
			let updatedLocation = previous[1];
			suppressReload();
			try {
				await calendar.modifyEvent(previous[1], next[0], (location) => {
					updatedLocation = location;
					updateLocation(previous[1], location);
				});
				setEvents((current) => updateEventEntry(current, previous[1], updatedLocation, next[0]));
			} catch (error) {
				console.error('Failed to modify calendar event', error);
				new Notice('Failed to save the event.');
			}
		},
		[calendar, updateLocation],
	);

	const handleDeleteEvent = useCallback(
		async (entry: EditableEventResponse) => {
			suppressReload();
			try {
				await calendar.deleteEvent(entry[1]);
				setEvents((current) => current.filter(([, location]) => location !== entry[1]));
			} catch (error) {
				console.error('Failed to delete calendar event', error);
				new Notice('Failed to delete the event.');
			}
		},
		[calendar],
	);

	const handleMoveEvent = useCallback(
		async (next: EditableEventResponse, previous: EditableEventResponse) => {
			let updatedLocation = previous[1];
			setEvents((current) => applyOptimisticMove(current, previous, next[0]));
			suppressReload();
			try {
				await calendar.modifyEvent(previous[1], next[0], (location) => {
					updatedLocation = location;
					updateLocation(previous[1], location);
				});
				setEvents((current) => updateEventEntry(current, previous[1], updatedLocation, next[0]));
			} catch (error) {
				setEvents((current) => rollbackOptimisticMove(current, previous, updatedLocation));
				console.error('Failed to move calendar event', error);
				new Notice('Failed to move the event.');
			}
		},
		[calendar, updateLocation],
	);

	useEffect(() => {
		void reloadEvents();
		return () => {
			if (reloadTimerRef.current !== null) {
				window.clearTimeout(reloadTimerRef.current);
			}
		};
	}, [reloadEvents]);

	useEffect(() => {
		return registerCalendarRefresh(app, calendarDirectory, () => {
			if (Date.now() < suppressReloadUntilRef.current) {
				scheduleReload();
				return;
			}
			scheduleReload();
		});
	}, [app, calendarDirectory, scheduleReload]);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{loadError ? (
				<div className="mx-auto mt-16 max-w-md border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-sm text-[color:var(--text-muted)]">
					{loadError}
				</div>
			) : (
				<>
					<div className="sticky top-0 z-40 bg-[var(--background-primary)]">
						<CalendarHeader
							title={
								viewMode === 'month'
									? formatMonthTitle(currentDate)
									: viewMode === 'day'
										? formatDayTitle(currentDate)
										: formatWeekTitle(currentDate)
							}
							onPrev={handlePrev}
							onNext={handleNext}
							onToday={handleToday}
							viewMode={viewMode}
							onViewChange={setViewMode}
						/>
					</div>
					{viewMode === 'month' && (
						<MonthCalendar
							app={app}
							events={events}
							onOpenNote={onOpenNote}
							onSaveEvent={handleSaveEvent}
							onDeleteEvent={handleDeleteEvent}
							onMoveEvent={handleMoveEvent}
							onCreateEvent={async (event: CalendarEvent) => {
								try {
									const location = await calendar.createEvent({ ...event, creator: 'calendar' });
									setEvents((current) => [...current, [event, location]]);
								} catch (error) {
									console.error('Failed to create calendar event', error);
									new Notice('Failed to create the event.');
								}
							}}
							initialDate={currentDate}
							onDateChange={setCurrentDate}
						/>
					)}
					{viewMode === 'week' && (
						<WeekCalendar
							app={app}
							events={events}
							onOpenNote={onOpenNote}
							onSaveEvent={handleSaveEvent}
							onDeleteEvent={handleDeleteEvent}
							onMoveEvent={handleMoveEvent}
							onCreateEvent={async (event: CalendarEvent) => {
								try {
									const location = await calendar.createEvent({ ...event, creator: 'calendar' });
									setEvents((current) => [...current, [event, location]]);
								} catch (error) {
									console.error('Failed to create calendar event', error);
									new Notice('Failed to create the event.');
								}
							}}
							initialDate={currentDate}
							onDateChange={setCurrentDate}
						/>
					)}
					{viewMode === 'day' && (
						<DayCalendar
							app={app}
							events={events}
							onOpenNote={onOpenNote}
							onSaveEvent={handleSaveEvent}
							onDeleteEvent={handleDeleteEvent}
							onMoveEvent={handleMoveEvent}
							onCreateEvent={async (event: CalendarEvent) => {
								try {
									const location = await calendar.createEvent({ ...event, creator: 'calendar' });
									setEvents((current) => [...current, [event, location]]);
								} catch (error) {
									console.error('Failed to create calendar event', error);
									new Notice('Failed to create the event.');
								}
							}}
							initialDate={currentDate}
							onDateChange={setCurrentDate}
						/>
					)}
					{viewMode === 'list' && (
						<ListCalendar
							app={app}
							events={events}
							onOpenNote={onOpenNote}
							onSaveEvent={handleSaveEvent}
							onDeleteEvent={handleDeleteEvent}
							onMoveEvent={handleMoveEvent}
							onCreateEvent={async (event: CalendarEvent) => {
								try {
									const location = await calendar.createEvent({ ...event, creator: 'calendar' });
									setEvents((current) => [...current, [event, location]]);
								} catch (error) {
									console.error('Failed to create calendar event', error);
									new Notice('Failed to create the event.');
								}
							}}
							initialDate={currentDate}
							onDateChange={setCurrentDate}
						/>
					)}
				</>
			)}
		</div>
	);
};

export const mountCalendarUI = (
	containerEl: HTMLElement,
	app: App,
	calendar: FullNoteCalendar,
	onOpenNote: (path: string) => void,
): void => {
	render(<CalendarRoot app={app} calendar={calendar} onOpenNote={onOpenNote} />, containerEl);
};

export const unmountCalendarUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};
