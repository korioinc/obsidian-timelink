import { useLaneCardDnd } from '../hooks/use-lane-card-dnd.ts';
import { clearActiveCardDrag, getActiveCardDrag, setActiveCardDrag } from '../utils/card-dnd.ts';
import type { TargetedDragEvent } from 'preact';
import { afterEach, assert, test, vi } from 'vitest';

vi.mock('preact/hooks', () => ({
	useRef: <T>(initial: T) => ({ current: initial }),
}));

type MockDataTransfer = {
	effectAllowed: string;
	store: Record<string, string>;
	getData: (type: string) => string;
	setData: (type: string, value: string) => void;
};

function createDataTransfer(): MockDataTransfer {
	return {
		effectAllowed: '',
		store: {},
		getData(type: string) {
			return this.store[type] ?? '';
		},
		setData(type: string, value: string) {
			this.store[type] = value;
		},
	};
}

function createHandlers() {
	return useLaneCardDnd({
		laneId: 'lane-a',
		sourcePath: 'board.md',
		listRef: { current: null },
		wrapperRef: { current: null },
		isInteractionLocked: false,
		onMoveCard: vi.fn(() => Promise.resolve()),
		onMoveCardFromOtherBoard: vi.fn(() => Promise.resolve()),
		onCardDragStart: vi.fn(),
		onCardDragEnd: vi.fn(),
	});
}

afterEach(() => {
	clearActiveCardDrag();
	vi.clearAllMocks();
});

void test('card drag start stops propagation while preparing internal drag payload', () => {
	const handlers = createHandlers();
	const dataTransfer = createDataTransfer();
	const stopPropagation = vi.fn();
	const classListAdd = vi.fn();

	handlers.handleCardDragStart(
		{
			stopPropagation,
			currentTarget: {
				classList: {
					add: classListAdd,
				},
			},
			dataTransfer,
		} as unknown as TargetedDragEvent<HTMLLIElement>,
		{
			id: 'card-1',
			title: 'Task',
			lineStart: 0,
		},
		2,
	);

	assert.strictEqual(stopPropagation.mock.calls.length, 1);
	assert.strictEqual(classListAdd.mock.calls[0]?.[0], 'opacity-40');
	assert.deepEqual(getActiveCardDrag(), {
		sourceBoardPath: 'board.md',
		cardId: 'card-1',
		fromLaneId: 'lane-a',
		fromIndex: 2,
		title: 'Task',
		blockId: undefined,
		handled: false,
	});
});

void test('card drag end stops propagation before clearing internal drag state', () => {
	const handlers = createHandlers();
	const stopPropagation = vi.fn();
	const classListRemove = vi.fn();

	setActiveCardDrag({
		sourceBoardPath: 'board.md',
		cardId: 'card-1',
		fromLaneId: 'lane-a',
		fromIndex: 0,
		title: 'Task',
	});

	handlers.handleCardDragEnd(
		{
			stopPropagation,
			currentTarget: {
				classList: {
					remove: classListRemove,
				},
			},
		} as unknown as TargetedDragEvent<HTMLLIElement>,
		'card-1',
	);

	assert.strictEqual(stopPropagation.mock.calls.length, 1);
	assert.strictEqual(classListRemove.mock.calls[0]?.[0], 'opacity-40');
	assert.strictEqual(getActiveCardDrag(), null);
});
