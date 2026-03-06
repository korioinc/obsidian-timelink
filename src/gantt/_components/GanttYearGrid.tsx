import {
	GANTT_BOARD_COLUMN_WIDTH,
	GANTT_DAY_COLUMN_WIDTH,
	GANTT_LABEL_COLUMN_WIDTH,
	GANTT_ROW_HEIGHT,
	GANTT_TASK_COLUMN_WIDTH,
} from '../constants';
import type {
	GanttBoardLabel,
	GanttDayCell,
	GanttDisplayRow,
	GanttMonthCell,
	GanttYearView,
} from '../types';
import { resolveInitialGanttScrollLeft } from '../utils/initial-scroll';
import { useEffect, useRef } from 'preact/hooks';

type GanttYearGridProps = {
	view: GanttYearView;
	onOpenBoard: (boardPath: string) => void | Promise<void>;
	scrollToTodayRequestKey: number;
};

const buildTrackBackground = () => ({
	backgroundImage: `repeating-linear-gradient(to right, var(--background-modifier-border) 0, var(--background-modifier-border) 1px, transparent 1px, transparent ${GANTT_DAY_COLUMN_WIDTH}px)`,
});
const TODAY_HIGHLIGHT_STYLE = 'rgba(248, 113, 113, 0.12)';

const stickyBoardStyle = {
	width: `${GANTT_BOARD_COLUMN_WIDTH}px`,
	minHeight: `${GANTT_ROW_HEIGHT}px`,
	backgroundColor: 'var(--background-primary)',
};

const stickyTaskStyle = {
	left: `${GANTT_BOARD_COLUMN_WIDTH}px`,
	width: `${GANTT_TASK_COLUMN_WIDTH}px`,
	minHeight: `${GANTT_ROW_HEIGHT}px`,
	backgroundColor: 'var(--background-primary)',
};

const MonthHeaderCell = ({ month }: { month: GanttMonthCell }) => (
	<div
		className="flex shrink-0 items-center justify-center border-r border-[var(--background-modifier-border)] px-2 py-2 text-xs font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase"
		style={{ width: `${month.dayCount * GANTT_DAY_COLUMN_WIDTH}px` }}
	>
		{month.label}
	</div>
);

const DayNumberCell = ({ day, isToday }: { day: GanttDayCell; isToday: boolean }) => (
	<div
		className="flex shrink-0 items-center justify-center border-r border-[var(--background-modifier-border)] py-1 text-[11px] font-semibold text-[color:var(--text-normal)]"
		style={{
			width: `${GANTT_DAY_COLUMN_WIDTH}px`,
			backgroundColor: isToday ? TODAY_HIGHLIGHT_STYLE : undefined,
		}}
	>
		{day.label}
	</div>
);

const BoardNameCell = ({
	board,
	onOpenBoard,
}: {
	board: GanttBoardLabel | null;
	onOpenBoard: (boardPath: string) => void | Promise<void>;
}) => (
	<div
		className="sticky left-0 z-20 shrink-0 border-r border-[var(--background-modifier-border)]"
		style={stickyBoardStyle}
	>
		<div className="flex h-full items-center gap-2 px-3">
			{board ? (
				<>
					<span
						className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full border"
						style={{
							backgroundColor: board.kanbanColor ?? 'transparent',
							borderColor: board.kanbanColor ?? 'var(--text-faint)',
						}}
					/>
					<button
						type="button"
						className="min-w-0 truncate text-left text-sm font-semibold text-[color:var(--text-normal)] transition hover:text-[color:var(--text-accent)] hover:underline"
						onClick={() => {
							void onOpenBoard(board.path);
						}}
					>
						{board.basename}
					</button>
				</>
			) : null}
		</div>
	</div>
);

const TaskNameCell = ({ row }: { row: GanttDisplayRow }) => (
	<div
		className="sticky z-20 shrink-0 border-r border-[var(--background-modifier-border)]"
		style={stickyTaskStyle}
	>
		<div className="flex h-full items-center px-3 text-sm text-[color:var(--text-normal)]">
			<div className="truncate">{row.title}</div>
		</div>
	</div>
);

const EventRow = ({
	row,
	onOpenBoard,
	todayDayIndex,
}: {
	row: GanttDisplayRow;
	onOpenBoard: (boardPath: string) => void | Promise<void>;
	todayDayIndex: number | null;
}) => (
	<div className="flex min-h-0 border-b border-[var(--background-modifier-border)]">
		<BoardNameCell board={row.boardLabel} onOpenBoard={onOpenBoard} />
		<TaskNameCell row={row} />
		<div
			className="relative shrink-0"
			style={{
				...buildTrackBackground(),
				minWidth: 'var(--gantt-track-width)',
				height: `${GANTT_ROW_HEIGHT}px`,
			}}
		>
			{todayDayIndex !== null ? (
				<div
					className="absolute top-0 bottom-0"
					style={{
						left: `${todayDayIndex * GANTT_DAY_COLUMN_WIDTH}px`,
						width: `${GANTT_DAY_COLUMN_WIDTH}px`,
						backgroundColor: TODAY_HIGHLIGHT_STYLE,
					}}
				/>
			) : null}
			<div
				className="group absolute top-[6px] bottom-[6px]"
				style={{
					left: `${row.startDayIndex * GANTT_DAY_COLUMN_WIDTH}px`,
					width: `${row.spanDays * GANTT_DAY_COLUMN_WIDTH}px`,
				}}
			>
				<div
					className="h-full w-full rounded-md border opacity-90"
					style={{
						backgroundColor: row.color,
						borderColor: row.color,
					}}
				/>
				<div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 max-w-[220px] -translate-x-1/2 rounded-md border border-[color:rgba(255,255,255,0.22)] bg-[color:rgba(16,18,24,0.96)] px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition group-hover:opacity-100">
					<div className="truncate">{row.title}</div>
				</div>
			</div>
		</div>
	</div>
);

export const GanttYearGrid = ({
	view,
	onOpenBoard,
	scrollToTodayRequestKey,
}: GanttYearGridProps) => {
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const lastAutoScrolledYearRef = useRef<number | null>(null);
	const trackWidth = `${view.totalDays * GANTT_DAY_COLUMN_WIDTH}px`;

	useEffect(() => {
		if (view.todayDayIndex === null) return;
		const container = scrollContainerRef.current;
		if (!container) return;
		const shouldAutoScrollOnOpen = lastAutoScrolledYearRef.current !== view.year;
		const shouldScrollFromTodayRequest = scrollToTodayRequestKey > 0;
		if (!shouldAutoScrollOnOpen && !shouldScrollFromTodayRequest) return;
		container.scrollLeft = resolveInitialGanttScrollLeft({
			todayDayIndex: view.todayDayIndex,
			dayColumnWidth: GANTT_DAY_COLUMN_WIDTH,
			labelColumnWidth: GANTT_LABEL_COLUMN_WIDTH,
			viewportWidth: container.clientWidth,
			totalDays: view.totalDays,
		});
		lastAutoScrolledYearRef.current = view.year;
	}, [scrollToTodayRequestKey, view.todayDayIndex, view.totalDays, view.year]);

	return (
		<div
			className="min-h-0 overflow-auto"
			ref={scrollContainerRef}
			style={{ ['--gantt-track-width' as string]: trackWidth }}
		>
			<div className="min-w-max">
				<div className="sticky top-0 z-30 bg-[var(--background-primary)]">
					<div className="flex border-b border-[var(--background-modifier-border)]">
						<div
							className="sticky left-0 z-30 shrink-0 border-r border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-4 py-2 text-xs font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase"
							style={{ width: `${GANTT_LABEL_COLUMN_WIDTH}px` }}
						>
							Kanban boards
						</div>
						<div className="flex shrink-0" style={{ minWidth: trackWidth }}>
							{view.months.map((month) => (
								<MonthHeaderCell key={month.key} month={month} />
							))}
						</div>
					</div>
					<div className="flex border-b border-[var(--background-modifier-border)]">
						<div
							className="sticky left-0 z-30 shrink-0 border-r border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase"
							style={{ width: `${GANTT_BOARD_COLUMN_WIDTH}px` }}
						>
							Board
						</div>
						<div
							className="sticky z-30 shrink-0 border-r border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase"
							style={{
								left: `${GANTT_BOARD_COLUMN_WIDTH}px`,
								width: `${GANTT_TASK_COLUMN_WIDTH}px`,
							}}
						>
							Task
						</div>
						<div className="flex shrink-0" style={{ minWidth: trackWidth }}>
							{view.dayCells.map((day) => (
								<DayNumberCell
									day={day}
									isToday={
										view.todayDayIndex !== null &&
										Number(day.label) === Number(view.dayCells[view.todayDayIndex]?.label) &&
										day.key === view.dayCells[view.todayDayIndex]?.key
									}
									key={day.key}
								/>
							))}
						</div>
					</div>
				</div>
				{view.rows.map((row) => (
					<EventRow
						key={row.id}
						onOpenBoard={onOpenBoard}
						row={row}
						todayDayIndex={view.todayDayIndex}
					/>
				))}
			</div>
		</div>
	);
};
