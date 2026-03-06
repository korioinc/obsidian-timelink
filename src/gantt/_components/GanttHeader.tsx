type GanttHeaderProps = {
	year: number;
	onPrevYear: () => void;
	onNextYear: () => void;
	onCurrentYear: () => void;
};

const BUTTON_CLASS =
	'rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-normal)] transition hover:bg-[var(--background-secondary-alt)]';
const ICON_BUTTON_CLASS = `${BUTTON_CLASS} inline-flex h-10 w-10 items-center justify-center px-0`;

const ChevronLeftIcon = () => (
	<svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
		<path
			d="M15 18l-6-6 6-6"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
		/>
	</svg>
);

const ChevronRightIcon = () => (
	<svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
		<path
			d="M9 6l6 6-6 6"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
		/>
	</svg>
);

export const GanttHeader = ({ year, onPrevYear, onNextYear, onCurrentYear }: GanttHeaderProps) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-4 py-3">
			<div>
				<div className="text-lg font-semibold text-[color:var(--text-normal)]">Year gantt</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					aria-label="Previous year"
					className={ICON_BUTTON_CLASS}
					type="button"
					onClick={onPrevYear}
				>
					<ChevronLeftIcon />
				</button>
				<button
					aria-label="Next year"
					className={ICON_BUTTON_CLASS}
					type="button"
					onClick={onNextYear}
				>
					<ChevronRightIcon />
				</button>
				<button className={BUTTON_CLASS} type="button" onClick={onCurrentYear}>
					Today
				</button>
				<div className="min-w-20 text-center text-base font-semibold text-[color:var(--text-normal)]">
					{year}
				</div>
			</div>
		</div>
	);
};
