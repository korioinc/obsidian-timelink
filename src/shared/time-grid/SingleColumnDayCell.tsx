import type { ComponentChildren } from 'preact';

type SingleColumnDayCellProps = {
	dateKey: string;
	isToday: boolean;
	className?: string;
	style?: Record<string, string | number>;
	children?: ComponentChildren;
};

export const SingleColumnDayCell = ({
	dateKey,
	isToday,
	className = '',
	style,
	children,
}: SingleColumnDayCellProps) => {
	return (
		<div
			data-date-key={dateKey}
			className={`bg-transparent ${
				isToday ? 'bg-[color-mix(in srgb, var(--interactive-accent) 4%, transparent)]' : ''
			} ${className}`}
			style={style}
		>
			{children}
		</div>
	);
};
