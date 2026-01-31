import type { WeekHeaderProps } from '../types';
import { WEEKDAY_LABELS } from '../utils/month-calendar-utils';

export const WeekHeader = ({ weekCells, isToday }: WeekHeaderProps) => {
	return (
		<div className="flex border-x border-[var(--background-modifier-border)]">
			<div className="w-[56px] shrink-0 border-r border-[var(--background-modifier-border)]" />
			<div className="grid flex-1 grid-cols-7 divide-x divide-[var(--background-modifier-border)]">
				{WEEKDAY_LABELS.map((label, index) => {
					const cellDate = weekCells[index]?.date;
					const today = cellDate ? isToday(cellDate) : false;
					return (
						<div
							className="bg-transparent py-2 text-center text-xs font-semibold tracking-[0.12em] text-[color:var(--text-muted)] uppercase"
							key={label}
						>
							<div className="flex flex-col items-center gap-1">
								<span>{label}</span>
								{cellDate ? (
									<span
										className={`inline-flex h-7 w-7 items-center justify-center rounded-full pl-px text-[11px] leading-none font-semibold tabular-nums ${
											today
												? 'bg-[var(--interactive-accent)] text-[color:var(--text-on-accent)]'
												: 'bg-[var(--background-modifier-hover)] text-[color:var(--text-normal)]'
										}`}
									>
										{cellDate.getDate()}
									</span>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
