import {
	createAllDayEventSegment as createSegment,
	createEventModalState as createModalState,
} from '../../../shared/__test__/helpers/event-factories.ts';
import {
	createGridEventClickHandler,
	handleCreateSaveFactory,
	handleDateClickFactory,
	handleModalSaveFactory,
	handleToggleCompletedFactory,
} from '../../../shared/event/modal-interaction.ts';
import type { CalendarEvent, CreateEventState, EventSegment } from '../../types';
import { assert, test } from 'vitest';

void test('handleToggleCompletedFactory toggles task event completion only', () => {
	let savedCount = 0;
	let nextCompleted: boolean | undefined;
	const onSave = (next: [CalendarEvent, EventSegment['location']]) => {
		savedCount += 1;
		nextCompleted = next[0].completed;
	};
	const handleToggleCompleted = handleToggleCompletedFactory(onSave);

	handleToggleCompleted(createSegment({ taskEvent: true, completed: false }));
	assert.strictEqual(savedCount, 1);
	assert.strictEqual(nextCompleted, true);

	handleToggleCompleted(createSegment({ taskEvent: false, completed: false }));
	assert.strictEqual(savedCount, 1);
});

void test('handleDateClickFactory closes open more menu and blocks create when dragging', () => {
	let closeCount = 0;
	let createCount = 0;
	const handler = handleDateClickFactory(
		() => ({ dateKey: '2026-03-01' }),
		() => createSegment(),
		{ current: false },
		() => {
			closeCount += 1;
		},
		() => {
			createCount += 1;
		},
	);

	handler('2026-03-05');

	assert.strictEqual(closeCount, 0);
	assert.strictEqual(createCount, 0);
});

void test('handleDateClickFactory opens create modal when menu is not open', () => {
	let startDate = '';
	let endDate = '';
	let allDay = false;
	const handler = handleDateClickFactory(
		() => null,
		() => null,
		{ current: false },
		() => undefined,
		(next) => {
			startDate = next.startDate;
			endDate = next.endDate;
			allDay = next.allDay;
		},
	);

	handler('2026-03-05');

	assert.strictEqual(startDate, '2026-03-05');
	assert.strictEqual(endDate, '');
	assert.strictEqual(allDay, true);
});

void test('handleModalSaveFactory validates draft and normalizes saved event', () => {
	const segment = createSegment({
		title: 'Before',
		allDay: false,
		date: '2026-03-03',
		endDate: '2026-03-04',
		taskEvent: true,
		completed: false,
		startTime: '09:00',
		endTime: '10:00',
		color: '#ABCDEF',
	});
	const modal = createModalState(segment);
	let noticeMessage = '';
	let saveCount = 0;
	let savedDate: string | undefined;
	let savedEndDate: string | null | undefined;
	let savedStartTime: string | undefined | null;
	let savedEndTime: string | undefined | null;
	let savedColor: string | undefined;
	let savedCompleted: boolean | undefined;
	let modalClosed = false;

	const handleModalSave = handleModalSaveFactory(
		() => modal,
		(next) => {
			saveCount += 1;
			savedDate = next[0].date;
			savedEndDate = next[0].endDate;
			savedStartTime = next[0].startTime;
			savedEndTime = next[0].endTime;
			savedColor = next[0].color;
			savedCompleted = next[0].completed;
		},
		(next) => {
			modalClosed = next === null;
		},
		(message) => {
			noticeMessage = message;
		},
	);

	handleModalSave({
		title: ' ',
		date: '2026-03-03',
		allDay: false,
		taskEvent: true,
		isCompleted: false,
		startTime: '09:00',
		endTime: '10:00',
		color: '#ABCDEF',
	});
	assert.strictEqual(noticeMessage, 'Please enter a title.');
	assert.strictEqual(saveCount, 0);

	noticeMessage = '';
	handleModalSave({
		title: 'After',
		date: '2026-03-03',
		allDay: false,
		taskEvent: true,
		isCompleted: false,
		startTime: '',
		endTime: '10:00',
		color: '#ABCDEF',
	});
	assert.strictEqual(noticeMessage, 'Start and end times are required for timed events.');
	assert.strictEqual(saveCount, 0);

	handleModalSave({
		title: 'After',
		date: '2026-03-05',
		allDay: true,
		taskEvent: true,
		isCompleted: true,
		startTime: '',
		endTime: '',
		color: 'blue',
	});
	assert.strictEqual(saveCount, 1);
	assert.strictEqual(savedDate, '2026-03-05');
	assert.strictEqual(savedEndDate, undefined);
	assert.strictEqual(savedStartTime, undefined);
	assert.strictEqual(savedEndTime, undefined);
	assert.strictEqual(savedColor, undefined);
	assert.strictEqual(savedCompleted, true);
	assert.strictEqual(modalClosed, true);
});

void test('handleCreateSaveFactory validates and creates normalized timed event', () => {
	const createModal: CreateEventState = {
		title: '',
		startDate: '2026-03-05',
		endDate: '2026-03-06',
		allDay: false,
		taskEvent: true,
		startTime: '09:00',
		endTime: '10:00',
		isCompleted: false,
		color: '',
	};
	let noticeMessage = '';
	let createCount = 0;
	let createdDate: string | undefined;
	let createdEndDate: string | null | undefined;
	let createdStartTime: string | undefined | null;
	let createdEndTime: string | undefined | null;
	let createdColor: string | undefined;
	let closed = false;

	const handleCreateSave = handleCreateSaveFactory(
		() => createModal,
		(next) => {
			createCount += 1;
			createdDate = next.date;
			createdEndDate = next.endDate;
			createdStartTime = next.startTime;
			createdEndTime = next.endTime;
			createdColor = next.color;
		},
		(next) => {
			closed = next === null;
		},
		(message) => {
			noticeMessage = message;
		},
	);

	handleCreateSave({
		title: ' ',
		date: '2026-03-05',
		allDay: false,
		taskEvent: true,
		isCompleted: false,
		startTime: '09:00',
		endTime: '10:00',
		color: '#abc',
	});
	assert.strictEqual(noticeMessage, 'Please enter a title.');
	assert.strictEqual(createCount, 0);

	noticeMessage = '';
	handleCreateSave({
		title: 'Created',
		date: '2026-03-05',
		allDay: false,
		taskEvent: true,
		isCompleted: true,
		startTime: '',
		endTime: '11:00',
		color: '#abc',
	});
	assert.strictEqual(noticeMessage, 'Start and end times are required for timed events.');
	assert.strictEqual(createCount, 0);

	handleCreateSave({
		title: 'Created',
		date: '2026-03-05',
		allDay: false,
		taskEvent: true,
		isCompleted: true,
		startTime: '09:30',
		endTime: '11:00',
		color: '#abc',
	});

	assert.strictEqual(createCount, 1);
	assert.strictEqual(createdDate, '2026-03-05');
	assert.strictEqual(createdEndDate, '2026-03-06');
	assert.strictEqual(createdStartTime, '09:30');
	assert.strictEqual(createdEndTime, '11:00');
	assert.strictEqual(createdColor, '#AABBCC');
	assert.strictEqual(closed, true);
});

void test('createGridEventClickHandler normalizes legacy 24:00 modal end time to next-day 00:00', () => {
	const segment = createSegment({
		allDay: false,
		date: '2026-03-05',
		startTime: '23:00',
		endTime: '24:00',
		endDate: undefined,
	});
	let modalEndTime = '';
	let modalEndDate: string | undefined | null = null;

	const handler = createGridEventClickHandler(
		(next) => {
			modalEndTime = next.endTime;
			modalEndDate = next.segment.event.endDate;
		},
		() => undefined,
		() => false,
		{ current: false },
	);

	handler(segment);

	assert.strictEqual(modalEndTime, '00:00');
	assert.strictEqual(modalEndDate, '2026-03-06');
});
