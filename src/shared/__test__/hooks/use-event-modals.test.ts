import type { CreateEventState } from '../../event/types';
import { useEventModals } from '../../hooks/use-event-modals.ts';
import { createEventModalState, createTimedEventSegment } from '../helpers/event-factories.ts';
import type { App } from 'obsidian';
import { afterEach, assert, beforeEach, test, vi } from 'vitest';

type EffectCleanup = () => void;

type FakeModalInstance = {
	openCalls: number;
	closeCalls: number;
	updatePropsCalls: number;
};

const harness = vi.hoisted(() => ({
	cleanups: [] as EffectCleanup[],
	instances: [] as FakeModalInstance[],
}));

vi.mock('preact/hooks', () => ({
	useRef: <T>(initialValue: T) => ({ current: initialValue }),
	useEffect: (effect: () => void | EffectCleanup) => {
		const cleanup = effect();
		if (cleanup) harness.cleanups.push(cleanup);
	},
}));

vi.mock('../../event-form/EventFormModal', () => ({
	EventFormModal: class {
		openCalls = 0;
		closeCalls = 0;
		updatePropsCalls = 0;

		constructor() {
			harness.instances.push(this);
		}

		open() {
			this.openCalls += 1;
		}

		close() {
			this.closeCalls += 1;
		}

		updateProps() {
			this.updatePropsCalls += 1;
		}
	},
}));

beforeEach(() => {
	harness.cleanups.length = 0;
	harness.instances.length = 0;
	vi.stubGlobal('window', {
		requestAnimationFrame: () => 0,
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

void test('useEventModals closes every owned modal when its component unmounts', () => {
	const editModal = createEventModalState(createTimedEventSegment());
	const createModal: CreateEventState = {
		title: '',
		startDate: '2026-03-01',
		endDate: '',
		allDay: true,
		taskEvent: false,
		startTime: '',
		endTime: '',
		isCompleted: false,
		color: '',
	};

	useEventModals({
		app: {} as App,
		modal: editModal,
		createModal,
		onEditSave: () => undefined,
		onEditDelete: () => undefined,
		onOpenNote: () => undefined,
		onCloseEdit: () => undefined,
		onCreateSave: () => undefined,
		onCloseCreate: () => undefined,
	});

	assert.deepEqual(
		harness.instances.map((instance) => instance.openCalls),
		[1, 1],
	);
	harness.cleanups.forEach((cleanup) => cleanup());
	assert.deepEqual(
		harness.instances.map((instance) => instance.closeCalls),
		[1, 1],
	);
});
