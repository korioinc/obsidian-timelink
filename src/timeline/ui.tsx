import type { EditableEventResponse, EventLocation, FullNoteCalendar } from '../calendar/calendar';
import {
	applyOptimisticMove,
	rollbackOptimisticMove,
	updateEventEntry,
	updateEventLocation,
} from '../calendar/event-sync';
import type { CalendarEvent } from '../calendar/types';
import { isToday } from '../calendar/utils/date-grid';
import { formatDateKey } from '../calendar/utils/month-calendar-utils';
import { TimelineHeader } from './_components/TimelineHeader';
import { TimelineDay } from './timeline-day';
import { Notice, type App, TAbstractFile, type Vault } from 'obsidian';
import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

const isCalendarPath = (file: TAbstractFile, directory: string): boolean => {
	if (!file.path) return false;
	return file.path === directory || file.path.startsWith(`${directory}/`);
};

const registerCalendarRefresh = (
	vault: Vault,
	calendarDirectory: string,
	onReload: () => void,
): (() => void) => {
	const onVaultChange = (file: TAbstractFile) => {
		if (!isCalendarPath(file, calendarDirectory)) return;
		onReload();
	};
	vault.on('create', onVaultChange);
	vault.on('modify', onVaultChange);
	vault.on('delete', onVaultChange);
	vault.on('rename', onVaultChange);
	return () => {
		vault.off('create', onVaultChange);
		vault.off('modify', onVaultChange);
		vault.off('delete', onVaultChange);
		vault.off('rename', onVaultChange);
	};
};

type TimelineUIProps = {
	app: App;
	calendar: FullNoteCalendar;
	onOpenNote: (path: string) => Promise<void> | void;
};

const TimelineRoot = ({ app, calendar, onOpenNote }: TimelineUIProps) => {
	const [loadError, setLoadError] = useState<string | null>(null);
	const [events, setEvents] = useState<EditableEventResponse[]>([]);
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

	useEffect(() => {
		void reloadEvents();
		return () => {
			if (reloadTimerRef.current !== null) {
				window.clearTimeout(reloadTimerRef.current);
			}
		};
	}, [reloadEvents]);

	useEffect(() => {
		return registerCalendarRefresh(app.vault, calendarDirectory, () => {
			if (Date.now() < suppressReloadUntilRef.current) {
				scheduleReload();
				return;
			}
			scheduleReload();
		});
	}, [app.vault, calendarDirectory, scheduleReload]);

	const updateLocation = useCallback((previous: EventLocation, next: EventLocation) => {
		setEvents((current) => updateEventLocation(current, previous, next));
	}, []);

	const handleSaveEvent = useCallback(
		async (next: EditableEventResponse, previous: EditableEventResponse) => {
			let updatedLocation = previous[1];
			setEvents((current) => updateEventEntry(current, previous[1], previous[1], next[0]));
			suppressReload();
			try {
				await calendar.modifyEvent(previous[1], next[0], (location) => {
					updatedLocation = location;
					updateLocation(previous[1], location);
				});
				setEvents((current) => updateEventEntry(current, previous[1], updatedLocation, next[0]));
			} catch (error) {
				setEvents((current) => updateEventEntry(current, previous[1], previous[1], previous[0]));
				console.error('Failed to modify calendar event', error);
				new Notice('Failed to save the event.');
			}
		},
		[calendar, suppressReload, updateLocation],
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
		[calendar, suppressReload],
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
		[calendar, suppressReload, updateLocation],
	);

	const handleCreateEvent = useCallback(
		async (event: CalendarEvent) => {
			suppressReload();
			try {
				const location = await calendar.createEvent({ ...event, creator: 'timeline' });
				setEvents((current) => [...current, [event, location]]);
			} catch (error) {
				console.error('Failed to create calendar event', error);
				new Notice('Failed to create the event.');
			}
		},
		[calendar, suppressReload],
	);

	const handlePrev = () => {
		const next = new Date(currentDate);
		next.setDate(next.getDate() - 1);
		setCurrentDate(next);
	};

	const handleNext = () => {
		const next = new Date(currentDate);
		next.setDate(next.getDate() + 1);
		setCurrentDate(next);
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{loadError ? (
				<div className="mx-auto mt-16 max-w-md border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-sm text-[color:var(--text-muted)]">
					{loadError}
				</div>
			) : (
				<>
					<div className="sticky top-0 z-40 bg-[var(--background-primary)]">
						<TimelineHeader
							title={`${isToday(currentDate) ? '🟢 ' : ''}${formatDateKey(currentDate)}`}
							onPrev={handlePrev}
							onNext={handleNext}
							onToday={handleToday}
						/>
					</div>
					<TimelineDay
						app={app}
						events={events}
						onOpenNote={onOpenNote}
						onSaveEvent={handleSaveEvent}
						onDeleteEvent={handleDeleteEvent}
						onMoveEvent={handleMoveEvent}
						onCreateEvent={handleCreateEvent}
						initialDate={currentDate}
						onDateChange={setCurrentDate}
					/>
				</>
			)}
		</div>
	);
};

export const mountTimelineUI = (
	containerEl: HTMLElement,
	app: App,
	calendar: FullNoteCalendar,
	onOpenNote: (path: string) => void,
): void => {
	render(<TimelineRoot app={app} calendar={calendar} onOpenNote={onOpenNote} />, containerEl);
};

export const unmountTimelineUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};
