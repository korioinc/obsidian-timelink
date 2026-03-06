import { EXTRA_COLORS, getDefaultEventColorHex, resolveHexColor } from './event-form-color';
import type { EventFormProps } from './event-form-types';
import { useMemo } from 'preact/hooks';

type EventFormViewProps = Omit<EventFormProps, 'primaryAction'> & {
	primaryAction: () => void;
	showTimeInputs: boolean;
	showCompleted: boolean;
	showQuickSetNextHourTask?: boolean;
	onTitleChange: (value: string) => void;
	onDateChange: (value: string) => void;
	onAllDayChange: (checked: boolean) => void;
	onTaskEventChange: (checked: boolean) => void;
	onCompletedChange: (checked: boolean) => void;
	onStartTimeChange: (value: string) => void;
	onEndTimeChange: (value: string) => void;
	onColorChange: (value: string) => void;
	onQuickSetNextHourTask?: () => void;
};

export const EventFormView = ({
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
	showQuickSetNextHourTask,
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
	onQuickSetNextHourTask,
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
					{showQuickSetNextHourTask && onQuickSetNextHourTask ? (
						<button
							className="inline-flex h-10 w-10 items-center justify-center border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
							type="button"
							onClick={onQuickSetNextHourTask}
							aria-label="Set next 1 hour task"
							title="Set next 1 hour task"
						>
							<svg
								className="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="8" />
								<path d="M12 8v4l3 2" />
							</svg>
						</button>
					) : null}
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
				<div className="flex w-full flex-col items-start gap-3">
					<div className="flex w-full items-center gap-3">
						<label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
							<input
								type="checkbox"
								checked={allDay}
								onChange={(event) => onAllDayChange(event.currentTarget.checked)}
							/>
							<span>{allDayLabel}</span>
						</label>
					</div>
					<label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
						<input
							type="checkbox"
							checked={taskEvent}
							onChange={(event) => onTaskEventChange(event.currentTarget.checked)}
						/>
						<span>{taskEventLabel}</span>
					</label>
					{showCompleted ? (
						<label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-normal)]">
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
