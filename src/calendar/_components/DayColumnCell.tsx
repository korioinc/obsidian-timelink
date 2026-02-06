import type { ComponentChildren } from 'preact';

type DayColumnCellProps = {
	dateKey: string;
	isToday: boolean;
	isPressed: boolean;
	showTodayBorder?: boolean;
	className?: string;
	style?: Record<string, string | number>;
	onClick?: () => void;
	onPointerDown?: () => void;
	onPointerEnter?: () => void;
	children?: ComponentChildren;
};

const TODAY_BORDER_COLOR = 'color-mix(in srgb, var(--text-error) 78%, black)';

export const DayColumnCell = ({
	dateKey,
	isToday,
	isPressed,
	showTodayBorder = false,
	className = '',
	style,
	onClick,
	onPointerDown,
	onPointerEnter,
	children,
}: DayColumnCellProps) => {
	const mergedStyle = {
		...style,
		...(showTodayBorder && isToday
			? {
					outline: `1px dotted ${TODAY_BORDER_COLOR}`,
					outlineOffset: '-1px',
				}
			: {}),
	};

	return (
		<div
			data-date-key={dateKey}
			className={`bg-transparent ${
				isToday ? 'bg-[color-mix(in srgb, var(--interactive-accent) 4%, transparent)]' : ''
			} ${
				isPressed ? 'bg-[color-mix(in srgb, var(--interactive-accent) 16%, transparent)]' : ''
			} ${className}`}
			style={mergedStyle}
			onClick={onClick}
			onPointerDown={onPointerDown}
			onPointerEnter={onPointerEnter}
		>
			{children}
		</div>
	);
};
