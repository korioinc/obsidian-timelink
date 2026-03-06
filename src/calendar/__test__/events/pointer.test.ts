import { getDateKeyFromPointerFactory } from '../../services/interaction/pointer.ts';
import { assert, test } from 'vitest';

const createGridByIndex = () => Array.from({ length: 42 }, (_, index) => ({ key: `day-${index}` }));

void test('getDateKeyFromPointerFactory returns null when grid ref is missing', () => {
	const getDateKeyFromPointer = getDateKeyFromPointerFactory(
		{ current: null },
		createGridByIndex(),
	);
	assert.strictEqual(getDateKeyFromPointer(200, 300), null);
});

void test('getDateKeyFromPointerFactory resolves date key from pointer coordinates', () => {
	const getDateKeyFromPointer = getDateKeyFromPointerFactory(
		{
			current: {
				getBoundingClientRect: () =>
					({
						left: 100,
						top: 200,
						width: 700,
						height: 600,
					}) as DOMRect,
			} as HTMLDivElement,
		},
		createGridByIndex(),
	);
	const resolved = getDateKeyFromPointer(250, 450);
	assert.strictEqual(resolved, 'day-15');
});

void test('getDateKeyFromPointerFactory returns null for invalid grid size', () => {
	const getDateKeyFromPointer = getDateKeyFromPointerFactory(
		{
			current: {
				getBoundingClientRect: () =>
					({
						left: 100,
						top: 200,
						width: 0,
						height: 600,
					}) as DOMRect,
			} as HTMLDivElement,
		},
		createGridByIndex(),
	);
	assert.strictEqual(getDateKeyFromPointer(200, 300), null);
});
