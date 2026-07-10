import { createTimedEventSegment } from '../../../../shared/__test__/helpers/event-factories.ts';
import type { TimedDragAnchor } from '../../../../shared/event/types.ts';
import { TimedEventCard } from '../../../../shared/time-grid/TimedEventCard.tsx';
import { WeekTimeGrid } from '../../../_components/day-week/WeekTimeGrid.tsx';
import type { TimedEventPlacement, WeekTimeGridProps } from '../../../types';
import { isValidElement, type ComponentChildren } from 'preact';
import { assert, test } from 'vitest';

type InspectableTimedEventCardProps = {
	children?: ComponentChildren;
	dragAnchor?: TimedDragAnchor;
};

type InspectableTimedEventCard = {
	key: unknown;
	props: InspectableTimedEventCardProps;
};

const formatDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const createCrossDayPlacements = (): TimedEventPlacement[] => {
	const segment = createTimedEventSegment(
		{
			date: '2026-03-08',
			endDate: '2026-03-09',
			startTime: '23:30',
			endTime: '02:10',
		},
		{ start: '2026-03-08', end: '2026-03-09', span: 2 },
	);
	return [
		{
			segment,
			dayOffset: 0,
			startMinutes: 23 * 60 + 30,
			endMinutes: 24 * 60,
			column: 0,
			columnCount: 1,
		},
		{
			segment,
			dayOffset: 1,
			startMinutes: 0,
			endMinutes: 2 * 60 + 10,
			column: 0,
			columnCount: 1,
		},
	];
};

const createProps = (timedEvents: TimedEventPlacement[]): WeekTimeGridProps => ({
	weekCells: Array.from({ length: 7 }, (_, index) => ({
		date: new Date(2026, 2, 8 + index),
	})),
	todayIndex: 0,
	timedEvents,
	isToday: () => false,
	nowTop: 0,
	showNowIndicator: false,
	onEventClick: () => undefined,
	onToggleCompleted: () => undefined,
	formatDateKey,
	formatTime: (minutes) => String(minutes),
	DEFAULT_EVENT_COLOR: '#112233',
	SLOT_HEIGHT: 28,
	SLOT_MINUTES: 30,
	timeGridHeight: '1344px',
	selectionRange: null,
	onTimeGridPointerDown: () => undefined,
	onTimeGridPointerMove: () => undefined,
	onTimedResizeStart: () => undefined,
	timedResizingId: null,
	timedDraggingId: null,
	onTimedEventDragStart: () => undefined,
	onTimedEventDragEnd: () => undefined,
	onTimedEventDragOver: () => undefined,
	onTimedEventDrop: () => undefined,
	timeGridRef: { current: null },
	timedResizeRange: null,
	timedResizeColor: undefined,
	timedDragRange: null,
	timedDragColor: undefined,
	normalizeEventColor: () => null,
});

const collectTimedEventCards = (children: ComponentChildren): InspectableTimedEventCard[] => {
	const cards: InspectableTimedEventCard[] = [];
	const visit = (child: ComponentChildren): void => {
		if (Array.isArray(child)) {
			child.forEach(visit);
			return;
		}
		if (!isValidElement(child) || child.type !== TimedEventCard) {
			return;
		}
		const key: unknown = child.key;
		cards.push({ key, props: child.props });
	};
	visit(children);
	return cards;
};

const renderCrossDayCards = (): InspectableTimedEventCard[] => {
	const grid: unknown = WeekTimeGrid(createProps(createCrossDayPlacements()));
	if (!isValidElement(grid)) {
		throw new Error('WeekTimeGrid did not return a valid element.');
	}
	return collectTimedEventCards(grid.props.children);
};

void test('WeekTimeGrid gives cross-day slices stable unique keys', () => {
	const cards = renderCrossDayCards();

	assert.strictEqual(cards.length, 2);
	assert.strictEqual(new Set(cards.map((card) => card.key)).size, 2);
});

void test('WeekTimeGrid anchors each cross-day slice drag to its rendered start', () => {
	const cards = renderCrossDayCards();

	assert.deepEqual(
		cards.map((card) => card.props.dragAnchor),
		[
			{ dateKey: '2026-03-08', startMinutes: 23 * 60 + 30 },
			{ dateKey: '2026-03-09', startMinutes: 0 },
		],
	);
});
