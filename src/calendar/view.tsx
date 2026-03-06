import { EventLoadErrorPanel } from '../shared/event/EventLoadErrorPanel';
import { useDatedEventViewController } from '../shared/hooks/use-dated-event-view-controller';
import {
	DatedEventItemView,
	type DatedEventItemViewPluginContext,
} from '../shared/view/dated-event-item-view';
import { CalendarHeader } from './_components/calendar-header';
import { CALENDAR_VIEW_TYPE } from './constants';
import type { FullNoteCalendar } from './services/model-service';
import type { CalendarViewMode, CalendarViewProps } from './types';
import { formatDayTitle, formatMonthTitle, formatWeekTitle } from './utils/month-calendar-utils';
import { DayWeekCalendar } from './view/day-week-calendar';
import { ListCalendar } from './view/list-calendar';
import { MonthCalendar } from './view/month-calendar';
import type { App, WorkspaceLeaf } from 'obsidian';
import type { ComponentType } from 'preact';
import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';

const CALENDAR_VIEW_COMPONENTS: Record<CalendarViewMode, ComponentType<CalendarViewProps>> = {
	month: MonthCalendar,
	week: (props: CalendarViewProps) => <DayWeekCalendar {...props} mode="week" />,
	day: (props: CalendarViewProps) => <DayWeekCalendar {...props} mode="day" />,
	list: ListCalendar,
};

const formatTitleByViewMode = (viewMode: CalendarViewMode, date: Date): string => {
	if (viewMode === 'month') return formatMonthTitle(date);
	if (viewMode === 'day') return formatDayTitle(date);
	return formatWeekTitle(date);
};

type CalendarUIProps = {
	app: App;
	calendar: FullNoteCalendar;
	onOpenNote: (path: string) => Promise<void> | void;
};

type CalendarViewPluginContext = DatedEventItemViewPluginContext<FullNoteCalendar>;

const CalendarRoot = ({ app, calendar, onOpenNote }: CalendarUIProps) => {
	const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
	const {
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
	} = useDatedEventViewController({
		app,
		calendar,
		creator: 'calendar',
		viewMode,
		onOpenNote,
	});

	const currentViewTitle = useMemo(
		() => formatTitleByViewMode(viewMode, currentDate),
		[currentDate, viewMode],
	);

	const CurrentViewCalendar = CALENDAR_VIEW_COMPONENTS[viewMode];
	const viewProps: CalendarViewProps = {
		app,
		events,
		onOpenNote: handleOpenNote,
		onSaveEvent: handleSaveEvent,
		onDeleteEvent: handleDeleteEvent,
		onMoveEvent: handleMoveEvent,
		onCreateEvent: handleCreateEvent,
		initialDate: currentDate,
		onDateChange: setCurrentDate,
	};

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{loadError ? (
				<EventLoadErrorPanel message={loadError} />
			) : (
				<>
					<div className="sticky top-0 z-40 bg-[var(--background-primary)]">
						<CalendarHeader
							title={currentViewTitle}
							onPrev={handlePrev}
							onNext={handleNext}
							onToday={handleToday}
							viewMode={viewMode}
							onViewChange={setViewMode}
						/>
					</div>
					<CurrentViewCalendar {...viewProps} />
				</>
			)}
		</div>
	);
};

const mountCalendarUI = (
	containerEl: HTMLElement,
	app: App,
	calendar: FullNoteCalendar,
	onOpenNote: (path: string) => void,
): void => {
	render(<CalendarRoot app={app} calendar={calendar} onOpenNote={onOpenNote} />, containerEl);
};

const unmountCalendarUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};

export class TimeLinkCalendarView extends DatedEventItemView<FullNoteCalendar> {
	constructor(leaf: WorkspaceLeaf, plugin: CalendarViewPluginContext) {
		super(leaf, plugin);
	}

	getViewType(): string {
		return CALENDAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar-glyph';
	}

	protected getNotReadyText(): string {
		return 'Calendar not ready.';
	}

	protected mountDatedView(
		containerEl: HTMLElement,
		app: App,
		calendar: FullNoteCalendar,
		onOpenNote: (path: string) => void,
	): void {
		mountCalendarUI(containerEl, app, calendar, onOpenNote);
	}

	protected unmountDatedView(containerEl: HTMLElement): void {
		unmountCalendarUI(containerEl);
	}
}
