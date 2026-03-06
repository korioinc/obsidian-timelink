import { formatDateKey } from '../event/model-utils';
import { getNextHourTaskTimeRange } from './event-form-color';
import type { EventFormDraft, EventFormProps } from './event-form-types';
import { useEffect, useState } from 'preact/hooks';

const toDraft = (props: EventFormProps): EventFormDraft => ({
	title: props.title,
	date: props.date,
	endDate: props.endDate,
	allDay: props.allDay,
	taskEvent: props.taskEvent,
	isCompleted: props.isCompleted,
	startTime: props.startTime ?? '',
	endTime: props.endTime ?? '',
	color: props.color ?? '',
});

export const useEventFormDraft = (props: EventFormProps) => {
	const [draft, setDraft] = useState<EventFormDraft>(() => toDraft(props));

	useEffect(() => {
		setDraft(toDraft(props));
	}, [
		props.title,
		props.date,
		props.endDate,
		props.allDay,
		props.taskEvent,
		props.isCompleted,
		props.startTime,
		props.endTime,
		props.color,
	]);

	const showTimeInputs = !draft.allDay;
	const showCompleted = draft.taskEvent;
	const todayKey = formatDateKey(new Date());
	const showQuickSetNextHourTask =
		props.headerTitle === 'Edit event' && draft.allDay && draft.date === todayKey;

	const handleQuickSetNextHourTask = () => {
		const { startTime, endTime } = getNextHourTaskTimeRange(new Date());
		const nextDraft: EventFormDraft = {
			...draft,
			allDay: false,
			taskEvent: true,
			startTime,
			endTime,
		};
		props.primaryAction(nextDraft);
	};

	return {
		draft,
		setDraft,
		showTimeInputs,
		showCompleted,
		showQuickSetNextHourTask,
		handleQuickSetNextHourTask,
	};
};
