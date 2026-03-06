import { shiftDateByViewMode, type CalendarLikeViewMode } from '../event/model-utils';
import type { CalendarEvent } from '../event/types';
import {
	useEventEntriesController,
	type EventEntriesCalendar,
} from './use-event-entries-controller';
import { useSafeOpenNote } from './use-safe-open-note';
import type { App } from 'obsidian';
import { useState } from 'preact/hooks';

type UseDatedEventViewControllerParams = {
	app: App;
	calendar: EventEntriesCalendar;
	creator: CalendarEvent['creator'];
	viewMode: CalendarLikeViewMode;
	onOpenNote: (path: string) => Promise<void> | void;
};

export const useDatedEventViewController = ({
	app,
	calendar,
	creator,
	viewMode,
	onOpenNote,
}: UseDatedEventViewControllerParams) => {
	const [currentDate, setCurrentDate] = useState(() => new Date());
	const {
		events,
		loadError,
		notice,
		handleSaveEvent,
		handleDeleteEvent,
		handleMoveEvent,
		handleCreateEvent,
	} = useEventEntriesController({
		app,
		calendar,
		creator,
	});
	const handleOpenNote = useSafeOpenNote(onOpenNote, notice);

	const handlePrev = () => {
		setCurrentDate((previous) => shiftDateByViewMode(previous, viewMode, 'prev'));
	};

	const handleNext = () => {
		setCurrentDate((previous) => shiftDateByViewMode(previous, viewMode, 'next'));
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	return {
		currentDate,
		setCurrentDate,
		events,
		loadError,
		handleOpenNote,
		handlePrev,
		handleNext,
		handleToday,
		handleSaveEvent,
		handleDeleteEvent,
		handleMoveEvent,
		handleCreateEvent,
	};
};
