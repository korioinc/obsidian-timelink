import { PreactModal } from '../../ui/PreactModal';
import type { App } from 'obsidian';
import type { RefObject } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

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

type EventFormViewProps = Omit<EventFormProps, 'primaryAction'> & {
	primaryAction: () => void;
	showTimeInputs: boolean;
	showCompleted: boolean;
	onTitleChange: (value: string) => void;
	onDateChange: (value: string) => void;
	onAllDayChange: (checked: boolean) => void;
	onTaskEventChange: (checked: boolean) => void;
	onCompletedChange: (checked: boolean) => void;
	onStartTimeChange: (value: string) => void;
	onEndTimeChange: (value: string) => void;
	onColorChange: (value: string) => void;
};

const EXTRA_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];
const DEFAULT_EVENT_COLOR_FALLBACK = '#7850FF';

const resolveHexColor = (value: string): string | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('#')) {
		if (trimmed.length === 4) {
			return (
				'#' +
				trimmed
					.slice(1)
					.split('')
					.map((char) => char + char)
					.join('')
			).toUpperCase();
		}
		if (trimmed.length === 7) {
			return trimmed.toUpperCase();
		}
	}
	return null;
};

const toHex = (color: string): string => {
	if (typeof document === 'undefined') return DEFAULT_EVENT_COLOR_FALLBACK;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return DEFAULT_EVENT_COLOR_FALLBACK;
	ctx.fillStyle = color;
	const normalized = ctx.fillStyle;
	const match = normalized.match(/\d+/g);
	if (!match || match.length < 3) {
		return DEFAULT_EVENT_COLOR_FALLBACK;
	}
	const [r = 0, g = 0, b = 0] = match.slice(0, 3).map((value) => Number(value));
	const toTwo = (value: number) => value.toString(16).padStart(2, '0');
	return `#${toTwo(r)}${toTwo(g)}${toTwo(b)}`.toUpperCase();
};

const getDefaultEventColorHex = (): string => {
	if (typeof window === 'undefined') return DEFAULT_EVENT_COLOR_FALLBACK;
	const value = getComputedStyle(document.body).getPropertyValue('--interactive-accent');
	if (!value.trim()) return DEFAULT_EVENT_COLOR_FALLBACK;
	return resolveHexColor(value) ?? toHex(value);
};

const EventForm = ({
	title,
	date,
	allDay,
	taskEvent,
	isCompleted,
	startTime,
	endTime,
	color,
	showTimeInputs,
	showCompleted,
	primaryActionLabel,
	secondaryActionLabel,
	tertiaryActionLabel,
	allDayLabel,
	taskEventLabel,
	completedLabel,
	noteActionLabel,
	titlePlaceholder,
	headerTitle,
	primaryAction,
	secondaryAction,
	tertiaryAction,
	noteAction,
	onClose,
	onTitleChange,
	onDateChange,
	onAllDayChange,
	onTaskEventChange,
	onCompletedChange,
	onStartTimeChange,
	onEndTimeChange,
	onColorChange,
	titleRef,
	submitOnTitleEnter,
}: EventFormViewProps) => {
	const defaultColorHex = useMemo(() => getDefaultEventColorHex(), []);
	const safeColor = color ?? '';
	const isDefaultSelected = safeColor.trim().length === 0;
	const palette = [
		{ value: '', swatch: 'var(--interactive-accent)', label: 'Default' },
		...EXTRA_COLORS.map((paletteColor) => ({
			value: paletteColor,
			swatch: paletteColor,
			label: paletteColor,
		})),
	];
	const displayedColor = safeColor.trim().length > 0 ? safeColor : defaultColorHex;
	return (
		<div>
			<div className="flex items-center justify-between">
				{headerTitle ? (
					<div
						className={`text-lg font-semibold ${
							headerTitle === 'Edit event'
								? 'text-[color:var(--color-green)]'
								: 'text-[color:var(--color-blue)]'
						}`}
					>
						{headerTitle}
					</div>
				) : (
					<div />
				)}
				<button
					className="h-8 w-8 border border-transparent bg-transparent text-[color:var(--text-muted)]"
					type="button"
					onClick={onClose}
				>
					×
				</button>
			</div>
			<div className="mt-4">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<input
						className="w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-base font-semibold text-[color:var(--text-normal)]"
						ref={titleRef}
						value={title}
						placeholder={titlePlaceholder}
						onInput={(event) => onTitleChange((event.target as HTMLInputElement).value)}
						onKeyDown={(event) => {
							if (!submitOnTitleEnter) return;
							if (event.key !== 'Enter') return;
							if (event.isComposing) return;
							event.preventDefault();
							primaryAction();
						}}
					/>
					{noteAction && noteActionLabel ? (
						<button
							className="border border-transparent bg-[var(--background-secondary)] px-4 py-2 text-sm font-medium text-[color:var(--text-normal)]"
							type="button"
							onClick={noteAction}
						>
							{noteActionLabel}
						</button>
					) : null}
				</div>
				<div className="mb-4 flex flex-wrap items-center gap-3">
					<input
						className="h-10 border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-sm text-[color:var(--text-normal)]"
						type="date"
						value={date}
						onInput={(event) => onDateChange((event.target as HTMLInputElement).value)}
					/>
					{showTimeInputs ? (
						<div className="flex items-center gap-2">
							<input
								className="h-10 border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-sm text-[color:var(--text-normal)]"
								type="time"
								value={startTime ?? ''}
								onInput={(event) => onStartTimeChange((event.target as HTMLInputElement).value)}
							/>
							<input
								className="h-10 border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-sm text-[color:var(--text-normal)]"
								type="time"
								value={endTime ?? ''}
								onInput={(event) => onEndTimeChange((event.target as HTMLInputElement).value)}
							/>
						</div>
					) : null}
				</div>
				<div className="flex flex-col items-start gap-3">
					<label className="mb-2 inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
						<input
							type="checkbox"
							checked={allDay}
							onChange={(event) => onAllDayChange(event.currentTarget.checked)}
						/>
						<span>{allDayLabel}</span>
					</label>
					<label className="mb-2 inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
						<input
							type="checkbox"
							checked={taskEvent}
							onChange={(event) => onTaskEventChange(event.currentTarget.checked)}
						/>
						<span>{taskEventLabel}</span>
					</label>
					{showCompleted ? (
						<label className="mb-2 inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
							<input
								type="checkbox"
								checked={isCompleted}
								onChange={(event) => onCompletedChange(event.currentTarget.checked)}
							/>
							<span>{completedLabel}</span>
						</label>
					) : null}
				</div>
				<div className="mt-4">
					<div className="mb-2 text-sm font-medium text-[color:var(--text-muted)]">Event color</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							{palette.map((paletteColor, index) => {
								const isSelected =
									index === 0
										? isDefaultSelected
										: displayedColor.toLowerCase() === paletteColor.value.toLowerCase();
								return (
									<button
										key={paletteColor.value}
										type="button"
										className="h-7 w-7 rounded-full border-2 border-transparent p-0"
										style={{
											backgroundColor: paletteColor.swatch,
											borderColor: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
											boxShadow: isSelected
												? '0 0 0 2px rgba(0,0,0,0.25)'
												: '0 0 0 1px rgba(0,0,0,0.12)',
										}}
										onClick={() => onColorChange(paletteColor.value)}
										aria-label={`Select ${paletteColor.label}`}
									/>
								);
							})}
						</div>
						<input
							className="h-9 w-[120px] border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-xs tracking-[0.12em] text-[color:var(--text-normal)] uppercase"
							value={safeColor}
							placeholder={defaultColorHex}
							onInput={(event) => onColorChange((event.target as HTMLInputElement).value.trim())}
							onBlur={(event) => {
								const resolved = resolveHexColor((event.target as HTMLInputElement).value);
								onColorChange(resolved ?? '');
							}}
						/>
					</div>
				</div>
				<div className="mt-6 flex items-center justify-start gap-3">
					<button
						className="border border-transparent bg-[var(--background-secondary)] px-4 py-2 text-sm font-medium text-[color:var(--text-normal)]"
						type="button"
						onClick={() => primaryAction()}
					>
						{primaryActionLabel}
					</button>
					{secondaryAction && secondaryActionLabel ? (
						<button
							className="ml-auto !border-[rgba(239,68,68,0.72)] !bg-[rgba(239,68,68,0.22)] px-4 py-2 text-sm font-semibold !text-white hover:!border-[rgba(248,113,113,0.9)] hover:!bg-[rgba(239,68,68,0.34)]"
							type="button"
							onClick={secondaryAction}
						>
							{secondaryActionLabel}
						</button>
					) : null}
					{tertiaryAction && tertiaryActionLabel ? (
						<button
							className="border border-transparent bg-[var(--background-secondary)] px-4 py-2 text-sm font-medium text-[color:var(--text-normal)]"
							type="button"
							onClick={tertiaryAction}
						>
							{tertiaryActionLabel}
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
};

const EventFormContainer = (props: EventFormProps) => {
	const [draft, setDraft] = useState<EventFormDraft>(() => ({
		title: props.title,
		date: props.date,
		endDate: props.endDate,
		allDay: props.allDay,
		taskEvent: props.taskEvent,
		isCompleted: props.isCompleted,
		startTime: props.startTime ?? '',
		endTime: props.endTime ?? '',
		color: props.color ?? '',
	}));

	useEffect(() => {
		setDraft({
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

	return (
		<EventForm
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
			primaryAction={() => props.primaryAction(draft)}
		/>
	);
};

export class EventFormModal {
	private modal: PreactModal;
	private props: EventFormProps;
	private closeFn: (() => void) | null = null;
	private backdropPointerDown = false;

	constructor(app: App, props: EventFormProps) {
		this.props = props;
		this.modal = new PreactModal(app, (close) => {
			this.closeFn = close;
			return this.renderModal(close);
		});
	}

	private handleRequestClose = () => {
		this.props.onClose();
		this.closeFn?.();
	};

	private renderModal(close: () => void) {
		const mergedProps = { ...this.props, onClose: this.handleRequestClose };
		const requestClose = () => {
			mergedProps.onClose();
			close();
		};

		return (
			<div
				data-timelink-modal={mergedProps.headerTitle === 'Edit event' ? 'edit' : 'create'}
				className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--background-modifier-border)]"
				style={{
					backgroundColor: 'color-mix(in srgb, var(--background-primary) 55%, transparent)',
				}}
				onPointerDown={(event) => {
					this.backdropPointerDown = event.target === event.currentTarget;
				}}
				onClick={(event) => {
					if (event.target !== event.currentTarget) return;
					if (!this.backdropPointerDown) return;
					requestClose();
				}}
				onKeyDown={(event) => {
					if (event.key !== 'Escape') return;
					event.stopPropagation();
					requestClose();
				}}
				tabIndex={-1}
			>
				<div
					className="relative w-[720px] max-w-[90vw] rounded-lg bg-[var(--background-primary)] p-6 pt-8 text-[color:var(--text-normal)]"
					style={{
						border: '1px solid',
						borderColor: 'color-mix(in srgb, var(--background-modifier-border) 60%, transparent)',
					}}
					onClick={(event) => event.stopPropagation()}
				>
					<EventFormContainer
						{...mergedProps}
						onClose={requestClose}
						noteAction={
							mergedProps.noteAction
								? () => {
										mergedProps.noteAction?.();
										requestClose();
									}
								: undefined
						}
					/>
				</div>
			</div>
		);
	}

	updateProps(nextProps: EventFormProps) {
		this.props = nextProps;
		const close = this.closeFn;
		if (!close) return;
		this.modal.renderNode(this.renderModal(close));
	}

	open() {
		this.modal.open();
	}

	close() {
		this.modal.close();
	}
}
