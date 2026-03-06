import {
	DEFAULT_EVENT_COLOR,
	formatTime,
	normalizeEventColor,
	toMinutes,
} from '../../../shared/event/model-utils';
import type { EventSegment } from '../../types';
import type { JSX } from 'preact';

type ListEventRowProps = {
	segment: EventSegment;
	kind: 'all-day' | 'timed';
	onClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
};

export const ListEventRow = ({
	segment,
	kind,
	onClick,
	onToggleCompleted,
}: ListEventRowProps): JSX.Element => {
	const color = normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR;
	const timeLabel =
		kind === 'all-day'
			? 'all-day'
			: `${formatTime(toMinutes(segment.event.startTime) ?? 0)} - ${formatTime(
					toMinutes(segment.event.endTime) ?? toMinutes(segment.event.startTime) ?? 0,
				)}`;

	return (
		<div
			className="flex items-center gap-2 px-4 py-2 text-[13px] text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)]"
			onClick={() => onClick(segment)}
		>
			<span className="w-[90px] shrink-0 text-[12px] text-[color:var(--text-muted)]">
				{timeLabel}
			</span>
			<span
				className="inline-flex h-2 w-2 shrink-0 rounded-full"
				style={{ backgroundColor: color }}
			/>
			{segment.event.taskEvent ? (
				<input
					type="checkbox"
					checked={Boolean(segment.event.completed)}
					className="m-0 h-[12px] w-[12px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
					onClick={(event) => event.stopPropagation()}
					onChange={(event) => {
						event.stopPropagation();
						event.preventDefault();
						onToggleCompleted(segment);
					}}
				/>
			) : null}
			<span className={`${segment.event.completed ? 'line-through opacity-60' : ''}`}>
				{segment.event.title}
			</span>
		</div>
	);
};
