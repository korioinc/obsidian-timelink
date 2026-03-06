import type { JSX } from 'preact';

type TimelineHeaderProps = {
	title: string;
	onPrev: () => void;
	onNext: () => void;
	onToday: () => void;
};

type HeaderIconButtonProps = {
	className: string;
	ariaLabel: string;
	onActivate: () => void;
	children: JSX.Element | string;
};

const iconButtonClass =
	'flex h-5 w-5 items-center justify-center rounded-lg border border-transparent bg-[var(--background-secondary)] text-[11px] text-[color:var(--text-normal)] transition hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]';
const mutedIconButtonClass =
	'flex h-5 w-5 items-center justify-center rounded-lg border border-transparent bg-[var(--background-secondary)] text-[color:var(--text-muted)] transition hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]';

const HeaderIconButton = ({
	className,
	ariaLabel,
	onActivate,
	children,
}: HeaderIconButtonProps): JSX.Element => (
	<div
		className={className}
		onPointerDown={(event) => {
			event.preventDefault();
			event.stopPropagation();
		}}
		onClick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onActivate();
		}}
		role="button"
		tabIndex={0}
		aria-label={ariaLabel}
		onKeyDown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				event.stopPropagation();
				onActivate();
			}
		}}
	>
		{children}
	</div>
);

export const TimelineHeader = ({
	title,
	onPrev,
	onNext,
	onToday,
}: TimelineHeaderProps): JSX.Element => (
	<div
		className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--background-modifier-border)] px-3 py-1"
		style={{
			borderColor: 'color-mix(in srgb, var(--background-modifier-border) 26%, transparent)',
		}}
	>
		<div className="flex items-center gap-1.5">
			<HeaderIconButton className={iconButtonClass} ariaLabel="Previous day" onActivate={onPrev}>
				←
			</HeaderIconButton>
			<HeaderIconButton className={iconButtonClass} ariaLabel="Next day" onActivate={onNext}>
				→
			</HeaderIconButton>
			<HeaderIconButton className={mutedIconButtonClass} ariaLabel="Today" onActivate={onToday}>
				<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true" className="block">
					<rect
						x="3.5"
						y="5.5"
						width="17"
						height="15"
						rx="2"
						ry="2"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M7 3v4M17 3v4M3.5 9.5h17"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</HeaderIconButton>
		</div>
		<div className="text-[12px] font-semibold tracking-tight text-[color:var(--text-normal)]">
			{title}
		</div>
	</div>
);
