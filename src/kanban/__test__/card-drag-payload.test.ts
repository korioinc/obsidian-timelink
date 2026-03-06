/* eslint-disable import/no-nodejs-modules */
import {
	clearActiveCardDrag,
	getActiveCardDrag,
	markActiveCardDragHandled,
	parseCardDragPayload,
	readOrderByDataAttr,
	setActiveCardDrag,
	writeCardDragPayload,
} from '../utils/card-dnd.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

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

const payload = {
	sourceBoardPath: 'board-a.md',
	cardId: 'card-1',
	fromLaneId: 'lane-a',
	fromIndex: 0,
	title: 'Task',
	blockId: 'abc123',
};

void test('writeCardDragPayload + parseCardDragPayload roundtrip with mime payload', () => {
	clearActiveCardDrag();
	const dataTransfer = createDataTransfer();
	writeCardDragPayload(dataTransfer as unknown as DataTransfer, payload);
	const parsed = parseCardDragPayload(dataTransfer as unknown as DataTransfer);
	assert.deepEqual(parsed, payload);
	assert.equal(dataTransfer.effectAllowed, 'copyMove');
});

void test('parseCardDragPayload falls back to active drag payload when transfer is empty', () => {
	clearActiveCardDrag();
	setActiveCardDrag(payload);
	const dataTransfer = createDataTransfer();
	const parsed = parseCardDragPayload(dataTransfer as unknown as DataTransfer);
	assert.deepEqual(parsed, payload);
});

void test('markActiveCardDragHandled updates active state only for matching payload', () => {
	clearActiveCardDrag();
	setActiveCardDrag(payload);
	markActiveCardDragHandled(payload);
	assert.equal(getActiveCardDrag()?.handled, true);

	setActiveCardDrag(payload);
	markActiveCardDragHandled({ ...payload, cardId: 'card-2' });
	assert.equal(getActiveCardDrag()?.handled, false);
});

void test('readOrderByDataAttr extracts stable order by dataset key', () => {
	const container = {
		children: [
			{ dataset: { laneId: 'lane-a' } },
			{ dataset: {} },
			{ dataset: { laneId: 'lane-b' } },
		],
	} as unknown as HTMLElement;

	assert.deepEqual(readOrderByDataAttr(container, 'laneId'), ['lane-a', 'lane-b']);
});
