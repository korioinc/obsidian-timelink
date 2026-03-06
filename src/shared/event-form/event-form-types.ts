import type { RefObject } from 'preact';

export type EventFormDraft = {
	title: string;
	date: string;
	endDate?: string;
	allDay: boolean;
	taskEvent: boolean;
	isCompleted: boolean;
	startTime: string;
	endTime: string;
	color: string;
};

export type EventFormProps = {
	headerTitle?: string;
	title: string;
	date: string;
	endDate?: string;
	allDay: boolean;
	taskEvent: boolean;
	isCompleted: boolean;
	startTime?: string;
	endTime?: string;
	color?: string;
	primaryActionLabel: string;
	secondaryActionLabel?: string;
	tertiaryActionLabel?: string;
	allDayLabel: string;
	taskEventLabel: string;
	completedLabel: string;
	noteActionLabel?: string;
	titlePlaceholder?: string;
	primaryAction: (draft: EventFormDraft) => void;
	secondaryAction?: () => void;
	tertiaryAction?: () => void;
	noteAction?: () => void;
	onClose: () => void;
	titleRef?: RefObject<HTMLInputElement>;
	submitOnTitleEnter?: boolean;
};
