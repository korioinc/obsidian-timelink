import type { WeekHeaderProps } from '../types';
import { WEEKDAY_LABELS } from '../utils/month-calendar-utils';

type DayHeaderProps = {
	date: Date;
	isToday: WeekHeaderProps['isToday'];
};

export const DayHeader = ({ date, isToday }: DayHeaderProps) => {
	const label = WEEKDAY_LABELS[date.getDay()] ?? '';
	const today = isToday(date);
	return (
		<div className="flex border-x border-[var(--background-modifier-border)]">
			<div className="w-[56px] shrink-0 border-r border-[var(--background-modifier-border)]" />
			<div className="flex flex-1 divide-x divide-[var(--background-modifier-border)]">
				<div className="flex-1 bg-transparent py-2 text-center text-xs font-semibold tracking-[0.12em] text-[color:var(--text-muted)] uppercase">
					<div className="flex flex-col items-center gap-1">
						<span>{label}</span>
						<span
							className={`inline-flex h-7 w-7 items-center justify-center rounded-full pl-px text-[11px] leading-none font-semibold tabular-nums ${
								today
									? 'bg-[var(--interactive-accent)] text-[color:var(--text-on-accent)]'
									: 'bg-[var(--background-modifier-hover)] text-[color:var(--text-normal)]'
							}`}
						>
							{date.getDate()}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
