import { DragOverlay } from './_components/DragOverlay';
import { MorePopover } from './_components/MorePopover';
import { WeekCell } from './_components/WeekCell';
import {
	beginDragFromPopoverFactory,
	createDragCaptureHandlers,
	buildEventRowsWithLocations,
	createDragImage,
	createResizeEffectHandlers,
	createSelectionHandlers,
	createSelectionPointerUpHandler,
	deriveDragAndResizeState,
	deriveGridByIndex,
	deriveIndexByDateKey,
	deriveSelectionRange,
	EMPTY_SELECTION,
	getDateKeyFromPointerFactory,
	handleCreateSaveFactory,
	handleDateClickFactory,
	handleDragEndFactory,
	handleDragStartFactory,
	handleDropFactory,
	handleEventClickFactory,
	handleModalSaveFactory,
	handleResizeStartFactory,
	handleToggleCompletedFactory,
	isSelectionActive,
} from './events';
import type { CreateEventState, EventModalState, EventSegment, MonthCalendarProps } from './types';
import { useCalendarModals } from './ui';
import { buildMonthGrid } from './utils/date-grid';
import {
	getRowCapacity,
	getSelectionSpanForWeek,
	getWeekEventLayout,
	getWeekBounds,
	getWeekCells,
} from './utils/event-layout';
import {
	DEFAULT_EVENT_COLOR,
	EVENT_ROW_SPACING,
	WEEKDAY_LABELS,
	normalizeEventColor,
} from './utils/month-calendar-utils';
import { getGridRowCapacity } from './utils/row-capacity';
import { Notice } from 'obsidian';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

export const MonthCalendar = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	initialDate,
	onDateChange,
}: MonthCalendarProps) => {
	const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
	const currentDateRef = useRef(currentDate);
	const initialDateKeyRef = useRef(initialDate?.getTime() ?? null);
	const [modal, setModal] = useState<EventModalState | null>(null);
	const [dragging, setDragging] = useState<EventSegment | null>(null);
	const [dragHoverDateKey, setDragHoverDateKey] = useState<string | null>(null);
	const [resizing, setResizing] = useState<EventSegment | null>(null);
	const [resizeHoverDateKey, setResizeHoverDateKey] = useState<string | null>(null);
	const isResizingRef = useRef(false);
	const didDropRef = useRef(false);
	const [gridHeight, setGridHeight] = useState<number | null>(null);
	const [selection, setSelection] = useState<{
		isSelecting: boolean;
		anchorDateKey: string | null;
		hoverDateKey: string | null;
		startDateKey: string | null;
		endDateKey: string | null;
	}>(() => EMPTY_SELECTION);
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	const [moreMenu, setMoreMenu] = useState<{
		dateKey: string;
	} | null>(null);
	const dayGridRef = useRef<HTMLDivElement | null>(null);
	const popoverDragRef = useRef(false);

	const { beginSelection, updateSelection, endSelection } = createSelectionHandlers(setSelection);

	const isSelecting = useMemo(() => isSelectionActive(selection), [selection]);

	useEffect(() => {
		if (!isSelecting) return;
		const handlePointerUp = createSelectionPointerUpHandler(
			() => selection,
			setCreateModal,
			endSelection,
		);
		window.addEventListener('pointerup', handlePointerUp);
		return () => window.removeEventListener('pointerup', handlePointerUp);
	}, [endSelection, isSelecting, selection]);

	const grid = useMemo(
		() => buildMonthGrid(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
		[currentDate],
	);

	const gridByIndex = useMemo(() => deriveGridByIndex(grid), [grid]);

	const indexByDateKey = useMemo(() => deriveIndexByDateKey(gridByIndex), [gridByIndex]);

	useEffect(() => {
		const element = dayGridRef.current;
		if (!element) return;
		const updateHeight = () => {
			const next = element.clientHeight;
			setGridHeight(next > 0 ? next : null);
		};
		updateHeight();
		const observer = new ResizeObserver(updateHeight);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const GRID_TOP_OFFSET = 36;
	const gridRowCapacity = useMemo(
		() => getGridRowCapacity(gridHeight, 6, GRID_TOP_OFFSET, EVENT_ROW_SPACING),
		[gridHeight],
	);

	const eventRows = useMemo(() => buildEventRowsWithLocations(events, grid), [events, grid]);

	const { dragRange, resizeRange, dragHoverIndex } = useMemo(
		() =>
			deriveDragAndResizeState(
				dragging,
				dragHoverDateKey,
				resizing,
				resizeHoverDateKey,
				indexByDateKey,
			),
		[dragging, dragHoverDateKey, resizing, resizeHoverDateKey, indexByDateKey],
	);

	const notice = (message: string) => {
		new Notice(message);
	};

	const handleModalSave = handleModalSaveFactory(() => modal, onSaveEvent, setModal, notice);

	const handleCreateSave = handleCreateSaveFactory(
		() => createModal,
		onCreateEvent,
		setCreateModal,
		notice,
	);

	const handleCloseMoreMenu = () => {
		setMoreMenu(null);
	};

	const handleDateClick = handleDateClickFactory(
		() => moreMenu,
		() => dragging,
		popoverDragRef,
		handleCloseMoreMenu,
		setCreateModal,
	);

	const handleEventClick = handleEventClickFactory(
		(next) => setModal(next),
		endSelection,
		() => selection.isSelecting,
		isResizingRef,
	);

	const handleToggleCompleted = handleToggleCompletedFactory(onSaveEvent);

	const handleDrop = handleDropFactory(
		() => dragging,
		setDragging,
		setDragHoverDateKey,
		onMoveEvent,
		didDropRef,
	);

	const handleDragEnd = handleDragEndFactory(
		() => dragging,
		() => dragHoverDateKey,
		handleDrop,
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		popoverDragRef,
	);

	const handleResizeStart = handleResizeStartFactory(setResizing, setResizeHoverDateKey);

	const getDateKeyFromPointer = getDateKeyFromPointerFactory(dayGridRef, gridByIndex);

	const handleDragStart = handleDragStartFactory(
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		getDateKeyFromPointer,
	);

	useEffect(() => {
		const handlers = createResizeEffectHandlers(
			resizing,
			resizeHoverDateKey,
			getDateKeyFromPointer,
			setResizeHoverDateKey,
			onSaveEvent,
			setResizing,
			isResizingRef,
		);
		if (!handlers) return;
		const { handlePointerMove, handlePointerUp } = handlers;
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp, { once: true });
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
		};
	}, [getDateKeyFromPointer, onSaveEvent, resizeHoverDateKey, resizing]);

	const selectionRange = useMemo(
		() => deriveSelectionRange(selection, indexByDateKey),
		[selection, indexByDateKey],
	);

	useEffect(() => {
		if (currentDate.getTime() === currentDateRef.current.getTime()) return;
		onDateChange?.(currentDate);
		currentDateRef.current = currentDate;
	}, [currentDate, onDateChange]);

	useEffect(() => {
		const nextKey = initialDate?.getTime() ?? null;
		if (nextKey === initialDateKeyRef.current) return;
		initialDateKeyRef.current = nextKey;
		if (!initialDate) return;
		setCurrentDate(initialDate);
	}, [initialDate]);

	const handleModalDelete = () => {
		if (!modal) return;
		void onDeleteEvent([modal.segment.event, modal.segment.location]);
		setModal(null);
	};

	const handleOpenNote = () => {
		if (!modal?.segment.location.file.path) {
			new Notice('Unable to find the note path.');
			return;
		}
		onOpenNote(modal.segment.location.file.path);
	};

	const handleCloseEditModal = () => {
		setModal(null);
	};

	const handleCloseCreateModal = () => {
		setCreateModal(null);
	};

	useCalendarModals({
		app,
		modal,
		createModal,
		onEditSave: handleModalSave,
		onEditDelete: handleModalDelete,
		onOpenNote: handleOpenNote,
		onCloseEdit: handleCloseEditModal,
		onCreateSave: handleCreateSave,
		onCloseCreate: handleCloseCreateModal,
	});

	const beginDragFromPopover = beginDragFromPopoverFactory(
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		popoverDragRef,
		createDragImage,
	);
	const handleResizeBarStart = (segment: EventSegment) => {
		isResizingRef.current = true;
		handleResizeStart(segment);
	};

	const moreMenuEvents = useMemo(() => {
		if (!moreMenu) return [];
		const index = indexByDateKey.get(moreMenu.dateKey);
		if (index === undefined) return [];
		const weekStartIndex = Math.floor(index / 7) * 7;
		const weekEndIndex = weekStartIndex + 6;
		const layoutCapacity = Number.MAX_SAFE_INTEGER;
		const layout = getWeekEventLayout(eventRows, weekStartIndex, weekEndIndex, layoutCapacity);
		const dayOffset = index - weekStartIndex;
		const isInDay = (placement: { columnStart: number; spanInWeek: number }) => {
			const startOffset = Math.max(0, placement.columnStart - 1);
			const endOffset = Math.min(6, startOffset + placement.spanInWeek - 1);
			return dayOffset >= startOffset && dayOffset <= endOffset;
		};
		const orderedPlacements = [...layout.multiDayPlacements, ...layout.singleDayPlacements]
			.filter(isInDay)
			.sort((a, b) => {
				if (a.weekRow !== b.weekRow) {
					return a.weekRow - b.weekRow;
				}
				if (a.columnStart !== b.columnStart) {
					return a.columnStart - b.columnStart;
				}
				if (a.spanInWeek !== b.spanInWeek) {
					return b.spanInWeek - a.spanInWeek;
				}
				const aTime = a.segment.event.startTime;
				const bTime = b.segment.event.startTime;
				if (aTime !== bTime) {
					if (!aTime) return 1;
					if (!bTime) return -1;
					return aTime.localeCompare(bTime);
				}
				const aTitle = (a.segment.event.title ?? '').toLowerCase();
				const bTitle = (b.segment.event.title ?? '').toLowerCase();
				return aTitle.localeCompare(bTitle);
			});
		return orderedPlacements.map((placement) => ({
			segment: placement.segment,
			location: placement.segment.location,
		}));
	}, [eventRows, gridRowCapacity, indexByDateKey, moreMenu]);

	const { handleDragOverCapture, handleDragEnterCapture, handleDropCapture } =
		createDragCaptureHandlers(
			() => dragging,
			getDateKeyFromPointer,
			setDragHoverDateKey,
			handleDrop,
		);

	return (
		<div
			className="flex h-full w-full flex-col"
			onDragOverCapture={handleDragOverCapture}
			onDropCapture={handleDropCapture}
		>
			<div className="grid grid-cols-7 gap-px">
				{WEEKDAY_LABELS.map((label) => (
					<div
						className="bg-transparent py-2 text-center text-xs font-semibold tracking-[0.26em] text-[color:var(--text-muted)] uppercase"
						key={label}
					>
						{label}
					</div>
				))}
			</div>
			<div
				ref={dayGridRef}
				className="relative grid min-h-[580px] flex-1 grid-rows-6 gap-px"
				onDragOverCapture={handleDragOverCapture}
				onDragEnterCapture={handleDragEnterCapture}
				onDropCapture={handleDropCapture}
			>
				<MorePopover
					moreMenu={moreMenu}
					moreMenuEvents={moreMenuEvents}
					dayGridRef={dayGridRef}
					onClose={handleCloseMoreMenu}
					onEventClick={handleEventClick}
					onDragStartFromPopover={beginDragFromPopover}
					onDragEnd={handleDragEnd}
					onToggleCompleted={handleToggleCompleted}
					DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
					normalizeEventColor={normalizeEventColor}
				/>
				{Array.from({ length: 6 }).map((_, weekIndex) => {
					const { weekStartIndex, weekEndIndex } = getWeekBounds(weekIndex);
					const weekCells = getWeekCells(gridByIndex, weekStartIndex);
					const selectionSpan = getSelectionSpanForWeek(
						selectionRange,
						weekStartIndex,
						weekEndIndex,
					);
					const rowCapacity = getRowCapacity(gridRowCapacity);
					return (
						<div
							className="relative grid h-full min-h-0 grid-cols-1 gap-px"
							key={`week-${weekIndex}`}
						>
							<DragOverlay
								weekIndex={weekIndex}
								dragRange={dragRange}
								resizeRange={resizeRange}
								dragHoverIndex={dragHoverIndex}
								indexByDateKey={indexByDateKey}
								gridByIndex={gridByIndex}
								draggingColor={dragging?.event.color}
								resizingColor={resizing?.event.color}
								selectionSpan={selectionSpan}
								DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
								normalizeEventColor={normalizeEventColor}
							/>
							<div className="relative z-10 h-full min-h-0">
								<WeekCell
									weekStartIndex={weekStartIndex}
									weekEndIndex={weekEndIndex}
									weekCells={weekCells}
									eventRows={eventRows}
									rowCapacity={rowCapacity}
									anchorDateKey={selection.anchorDateKey}
									isSelecting={selection.isSelecting}
									draggingId={dragging?.id ?? null}
									onDateClick={handleDateClick}
									onSelectionStart={beginSelection}
									onSelectionHover={updateSelection}
									onDragStart={handleDragStart}
									onDragEnd={handleDragEnd}
									onEventClick={handleEventClick}
									onResizeStart={handleResizeBarStart}
									onToggleCompleted={handleToggleCompleted}
									onMoreClick={(dateKey) => setMoreMenu({ dateKey })}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
