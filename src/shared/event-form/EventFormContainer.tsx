import { EventFormView } from './EventFormView';
import type { EventFormProps } from './event-form-types';
import { useEventFormDraft } from './use-event-form-draft';

export const EventFormContainer = (props: EventFormProps) => {
	const {
		draft,
		setDraft,
		showTimeInputs,
		showCompleted,
		showQuickSetNextHourTask,
		handleQuickSetNextHourTask,
	} = useEventFormDraft(props);

	return (
		<EventFormView
			{...props}
			title={draft.title}
			date={draft.date}
			allDay={draft.allDay}
			taskEvent={draft.taskEvent}
			isCompleted={draft.isCompleted}
			startTime={draft.startTime}
			endTime={draft.endTime}
			color={draft.color}
			showTimeInputs={showTimeInputs}
			showCompleted={showCompleted}
			showQuickSetNextHourTask={showQuickSetNextHourTask}
			onTitleChange={(value) => setDraft((prev) => ({ ...prev, title: value }))}
			onDateChange={(value) => setDraft((prev) => ({ ...prev, date: value }))}
			onAllDayChange={(checked) =>
				setDraft((prev) => ({
					...prev,
					allDay: checked,
				}))
			}
			onTaskEventChange={(checked) =>
				setDraft((prev) => ({
					...prev,
					taskEvent: checked,
					isCompleted: checked ? prev.isCompleted : false,
				}))
			}
			onCompletedChange={(checked) => setDraft((prev) => ({ ...prev, isCompleted: checked }))}
			onStartTimeChange={(value) => setDraft((prev) => ({ ...prev, startTime: value }))}
			onEndTimeChange={(value) => setDraft((prev) => ({ ...prev, endTime: value }))}
			onColorChange={(value) => setDraft((prev) => ({ ...prev, color: value }))}
			onQuickSetNextHourTask={handleQuickSetNextHourTask}
			primaryAction={() => props.primaryAction(draft)}
		/>
	);
};
