import type { CalendarHeaderView, CalendarViewMode } from '../types';
import type { JSX } from 'preact';

type CalendarHeaderProps = {
	title: string;
	onPrev: () => void;
	onNext: () => void;
	onToday: () => void;
	viewMode: CalendarViewMode;
	onViewChange: (next: CalendarViewMode) => void;
};

const VIEW_OPTIONS: CalendarHeaderView[] = [
	{ value: 'month', label: 'month' },
	{ value: 'week', label: 'week' },
	{ value: 'day', label: 'day' },
	{ value: 'list', label: 'list' },
];

export const CalendarHeader = ({
	title,
	onPrev,
	onNext,
	onToday,
	viewMode,
	onViewChange,
}: CalendarHeaderProps): JSX.Element => (
	<div
		className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--background-modifier-border)] px-2 py-3"
		style={{
			borderColor: 'color-mix(in srgb, var(--background-modifier-border) 26%, transparent)',
		}}
	>
		<div className="flex items-center gap-2">
			<button
				className="h-8 w-8 border border-transparent bg-[var(--background-secondary)] text-[color:var(--text-normal)] transition hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
				type="button"
				onPointerDown={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onPrev();
				}}
			>
				←
			</button>
			<button
				className="h-8 w-8 border border-transparent bg-[var(--background-secondary)] text-[color:var(--text-normal)] transition hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
				type="button"
				onPointerDown={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onNext();
				}}
			>
				→
			</button>
			<button
				className="h-8 border border-transparent bg-[var(--background-secondary)] px-3 text-[11px] font-semibold tracking-[0.18em] text-[color:var(--text-muted)] uppercase transition hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
				type="button"
				onPointerDown={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onToday();
				}}
			>
				today
			</button>
		</div>
		<div className="text-[26px] font-semibold tracking-tight text-[color:var(--text-normal)]">
			{title}
		</div>
		<div className="isolate inline-flex rounded-md">
			{VIEW_OPTIONS.map((option, index) => {
				const isActive = option.value === viewMode;
				const isFirst = index === 0;
				const isLast = index === VIEW_OPTIONS.length - 1;
				return (
					<div
						aria-pressed={isActive}
						className={`relative inline-flex h-8 min-w-[64px] cursor-pointer items-center justify-center rounded-none px-3 text-xs tracking-[0.16em] uppercase transition focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)] active:translate-y-[1px] ${
							isFirst ? 'rounded-l-md' : ''
						} ${isLast ? 'rounded-r-md' : ''} ${index > 0 ? '-ml-px' : ''} ${
							isActive
								? 'z-10 border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] font-bold text-[color:var(--text-on-accent)] shadow-sm'
								: 'border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] font-medium text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]'
						}`}
						key={option.value}
						onPointerDown={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onViewChange(option.value);
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								event.stopPropagation();
								onViewChange(option.value);
							}
						}}
						role="button"
						tabIndex={0}
					>
						{option.label}
					</div>
				);
			})}
		</div>
	</div>
);
