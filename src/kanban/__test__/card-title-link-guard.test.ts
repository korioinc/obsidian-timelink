import {
	CARD_TITLE_LINK_CLICK_SUPPRESSION_MS,
	createCardTitleLinkClickGuard,
} from '../utils/card-title-link-click-guard.ts';
import { assert, test } from 'vitest';

void test('card title link clicks stay suppressed for a short window after drag', () => {
	let now = 1_000;
	const guard = createCardTitleLinkClickGuard(() => now);

	assert.strictEqual(guard.shouldSuppressClick(), false);

	guard.noteDragInteraction();
	assert.strictEqual(guard.shouldSuppressClick(), true);

	now += CARD_TITLE_LINK_CLICK_SUPPRESSION_MS - 1;
	assert.strictEqual(guard.shouldSuppressClick(), true);

	now += 1;
	assert.strictEqual(guard.shouldSuppressClick(), false);
});

void test('card title link drag suppression restarts on a new drag interaction', () => {
	let now = 5_000;
	const guard = createCardTitleLinkClickGuard(() => now);

	guard.noteDragInteraction();
	now += CARD_TITLE_LINK_CLICK_SUPPRESSION_MS - 10;
	guard.noteDragInteraction();

	now += CARD_TITLE_LINK_CLICK_SUPPRESSION_MS - 1;
	assert.strictEqual(guard.shouldSuppressClick(), true);

	now += 1;
	assert.strictEqual(guard.shouldSuppressClick(), false);
});
