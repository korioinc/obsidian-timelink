import { EventLoadErrorPanel } from '../shared/event/EventLoadErrorPanel';
import { useDatedEventViewController } from '../shared/hooks/use-dated-event-view-controller';
import {
	DatedEventItemView,
	type DatedEventItemViewPluginContext,
} from '../shared/view/dated-event-item-view';
import { TimelineHeader } from './_components/TimelineHeader';
import { TIMELINE_VIEW_ICON, TIMELINE_VIEW_TYPE } from './constants';
import { buildTimelineHeaderTitle } from './services/model-service';
import type { TimelineUIProps } from './types';
import { TimelineDayView } from './view/timeline-day-view';
import type { App, WorkspaceLeaf } from 'obsidian';
import { render } from 'preact';

type TimelineViewPluginContext = DatedEventItemViewPluginContext<TimelineUIProps['calendar']>;

const TimelineRoot = ({ app, calendar, onOpenNote }: TimelineUIProps) => {
	const {
		currentDate,
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
		creator: 'timeline',
		viewMode: 'day',
		onOpenNote,
	});

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{loadError ? (
				<EventLoadErrorPanel message={loadError} />
			) : (
				<>
					<div className="sticky top-0 z-40 bg-[var(--background-primary)]">
						<TimelineHeader
							title={buildTimelineHeaderTitle(currentDate)}
							onPrev={handlePrev}
							onNext={handleNext}
							onToday={handleToday}
						/>
					</div>
					<TimelineDayView
						app={app}
						events={events}
						onOpenNote={handleOpenNote}
						onSaveEvent={handleSaveEvent}
						onDeleteEvent={handleDeleteEvent}
						onMoveEvent={handleMoveEvent}
						onCreateEvent={handleCreateEvent}
						currentDate={currentDate}
					/>
				</>
			)}
		</div>
	);
};

const mountTimelineUI = (
	containerEl: HTMLElement,
	app: App,
	calendar: TimelineUIProps['calendar'],
	onOpenNote: (path: string) => void,
): void => {
	render(<TimelineRoot app={app} calendar={calendar} onOpenNote={onOpenNote} />, containerEl);
};

const unmountTimelineUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};

export class TimeLinkTimelineView extends DatedEventItemView<TimelineUIProps['calendar']> {
	constructor(leaf: WorkspaceLeaf, plugin: TimelineViewPluginContext) {
		super(leaf, plugin);
	}

	getViewType(): string {
		return TIMELINE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Timeline';
	}

	getIcon(): string {
		return TIMELINE_VIEW_ICON;
	}

	protected getNotReadyText(): string {
		return 'Timeline not ready.';
	}

	protected mountDatedView(
		containerEl: HTMLElement,
		app: App,
		calendar: TimelineUIProps['calendar'],
		onOpenNote: (path: string) => void,
	): void {
		mountTimelineUI(containerEl, app, calendar, onOpenNote);
	}

	protected unmountDatedView(containerEl: HTMLElement): void {
		unmountTimelineUI(containerEl);
	}
}
