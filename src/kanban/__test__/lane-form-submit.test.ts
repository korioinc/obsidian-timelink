import { submitLaneForm } from '../_components/LaneForm.tsx';
import { assert, expect, test, vi } from 'vitest';

void test('failed lane form submission unlocks and preserves the form', async () => {
	const setTitle = vi.fn();
	const setIsSubmitting = vi.fn();
	const onCancel = vi.fn();

	await expect(
		submitLaneForm({
			title: 'New lane',
			isSubmitting: false,
			setTitle,
			setIsSubmitting,
			onSubmit: () => Promise.reject(new Error('persist failed')),
			onCancel,
		}),
	).resolves.toBeUndefined();

	assert.deepEqual(setIsSubmitting.mock.calls, [[true], [false]]);
	assert.strictEqual(setTitle.mock.calls.length, 0);
	assert.strictEqual(onCancel.mock.calls.length, 0);
});

void test('successful lane form submission clears and closes the form', async () => {
	const setTitle = vi.fn();
	const setIsSubmitting = vi.fn();
	const onCancel = vi.fn();

	await submitLaneForm({
		title: 'New lane',
		isSubmitting: false,
		setTitle,
		setIsSubmitting,
		onSubmit: () => Promise.resolve(),
		onCancel,
	});

	assert.deepEqual(setIsSubmitting.mock.calls, [[true], [false]]);
	assert.deepEqual(setTitle.mock.calls, [['']]);
	assert.strictEqual(onCancel.mock.calls.length, 1);
});
