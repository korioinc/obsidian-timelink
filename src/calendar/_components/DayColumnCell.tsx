import type { ComponentChildren } from 'preact';

type DayColumnCellProps = {
	dateKey: string;
	isToday: boolean;
	isPressed: boolean;
	className?: string;
	style?: Record<string, string | number>;
	onClick?: () => void;
	onPointerDown?: () => void;
	onPointerEnter?: () => void;
	children?: ComponentChildren;
};

export const DayColumnCell = ({
	dateKey,
	isToday,
	isPressed,
	className = '',
	style,
	onClick,
	onPointerDown,
	onPointerEnter,
	children,
}: DayColumnCellProps) => {
	return (
		<div
			data-date-key={dateKey}
			className={`bg-transparent ${
				isToday ? 'bg-[color-mix(in srgb, var(--interactive-accent) 4%, transparent)]' : ''
			} ${
				isPressed ? 'bg-[color-mix(in srgb, var(--interactive-accent) 16%, transparent)]' : ''
			} ${className}`}
			style={style}
			onClick={onClick}
			onPointerDown={onPointerDown}
			onPointerEnter={onPointerEnter}
		>
			{children}
		</div>
	);
};
