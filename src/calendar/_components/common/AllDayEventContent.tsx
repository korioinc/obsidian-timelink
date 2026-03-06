import type { EventSegment } from '../../types';

type AllDayEventContentProps = {
	segment: EventSegment;
	onToggleCompleted: (segment: EventSegment) => void;
	containerClassName?: string;
	checkboxClassName?: string;
	checkboxStyle?: Record<string, string | number>;
};

export const AllDayEventContent = ({
	segment,
	onToggleCompleted,
	containerClassName = 'inline-flex items-center gap-[1px]',
	checkboxClassName = 'm-0 h-[10px] w-[10px] -translate-y-[1px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]',
	checkboxStyle,
}: AllDayEventContentProps) => {
	const startTime = segment.event.startTime?.trim() ?? '';
	const hasStartTime = startTime.length > 0;
	const isTaskEvent = Boolean(segment.event.taskEvent);

	return (
		<span className={containerClassName}>
			{isTaskEvent ? (
				<input
					type="checkbox"
					checked={Boolean(segment.event.completed)}
					title={segment.event.completed ? 'Mark incomplete' : 'Mark complete'}
					className={checkboxClassName}
					style={checkboxStyle}
					onPointerDown={(event) => {
						event.stopPropagation();
					}}
					onClick={(event) => {
						event.stopPropagation();
					}}
					onChange={(event) => {
						event.stopPropagation();
						event.preventDefault();
						event.currentTarget.checked = !segment.event.completed;
						onToggleCompleted(segment);
					}}
				/>
			) : null}
			{hasStartTime ? <span className="mr-1">{startTime}</span> : null}
			<span
				style={
					segment.event.completed
						? {
								textDecorationLine: 'line-through',
							}
						: undefined
				}
			>
				{segment.event.title}
			</span>
		</span>
	);
};
