import type { ComponentChildren } from 'preact';

type AllDaySectionFrameProps = {
	gridRef: { current: HTMLDivElement | null };
	onDragOverCapture: (event: DragEvent) => void;
	onDragEnterCapture: (event: DragEvent) => void;
	onDropCapture: (event: DragEvent) => void;
	overlay: ComponentChildren;
	children: ComponentChildren;
};

export const AllDaySectionFrame = ({
	gridRef,
	onDragOverCapture,
	onDragEnterCapture,
	onDropCapture,
	overlay,
	children,
}: AllDaySectionFrameProps) => (
	<div className="flex border-x border-[var(--background-modifier-border)]">
		<div className="flex w-[56px] shrink-0 items-center justify-center border-r border-[var(--background-modifier-border)] text-[10px] font-semibold tracking-[0.2em] text-[color:var(--text-muted)] uppercase">
			<span className="text-center whitespace-pre-line">ALL{'\n'}DAY</span>
		</div>
		<div
			ref={gridRef}
			className="relative z-60 min-h-[120px] flex-1 border-t border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
			onDragOverCapture={onDragOverCapture}
			onDragEnterCapture={onDragEnterCapture}
			onDropCapture={onDropCapture}
		>
			{overlay}
			<div className="relative z-10 h-full min-h-0">{children}</div>
		</div>
	</div>
);
