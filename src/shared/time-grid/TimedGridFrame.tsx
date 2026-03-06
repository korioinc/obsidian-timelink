import type { ComponentChildren } from 'preact';

type TimedGridFrameProps = {
	outerClassName: string;
	axisClassName: string;
	gridContainerClassName?: string;
	gridClassName: string;
	timeGridHeight: string;
	showNowIndicator: boolean;
	nowTop: number;
	timeGridRef: { current: HTMLDivElement | null };
	onTimeGridPointerDown: (event: PointerEvent) => void;
	onTimeGridPointerMove: (event: PointerEvent) => void;
	onTimedEventDragOver: (event: DragEvent) => void;
	onTimedEventDrop: (event: DragEvent) => void;
	renderAxisLabels: () => ComponentChildren;
	children: ComponentChildren;
};

export const TimedGridFrame = ({
	outerClassName,
	axisClassName,
	gridContainerClassName = 'relative min-h-0 flex-1 overflow-x-hidden',
	gridClassName,
	timeGridHeight,
	showNowIndicator,
	nowTop,
	timeGridRef,
	onTimeGridPointerDown,
	onTimeGridPointerMove,
	onTimedEventDragOver,
	onTimedEventDrop,
	renderAxisLabels,
	children,
}: TimedGridFrameProps) => (
	<div className={outerClassName}>
		<div className={axisClassName}>
			{showNowIndicator ? (
				<div
					className="pointer-events-none absolute top-0 right-0 h-full w-3"
					style={{ height: timeGridHeight, top: `-4px` }}
				>
					<div
						className="absolute ml-[4px] h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--text-error)]"
						style={{ top: `${nowTop}px` }}
					/>
				</div>
			) : null}
			{renderAxisLabels()}
		</div>
		<div className={gridContainerClassName}>
			<div
				ref={timeGridRef}
				className={gridClassName}
				onPointerDown={onTimeGridPointerDown}
				onPointerMove={onTimeGridPointerMove}
				onDragOver={onTimedEventDragOver}
				onDrop={onTimedEventDrop}
			>
				{children}
			</div>
		</div>
	</div>
);
