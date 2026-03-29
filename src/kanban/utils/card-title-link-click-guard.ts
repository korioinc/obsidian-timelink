export const CARD_TITLE_LINK_CLICK_SUPPRESSION_MS = 250;

const getInteractionTimestamp = (): number => {
	return globalThis.performance?.now() ?? Date.now();
};

export type CardTitleLinkClickGuard = {
	noteDragInteraction: () => void;
	shouldSuppressClick: () => boolean;
};

export function createCardTitleLinkClickGuard(
	getNow: () => number = getInteractionTimestamp,
): CardTitleLinkClickGuard {
	let suppressedUntil = 0;

	return {
		noteDragInteraction() {
			suppressedUntil = getNow() + CARD_TITLE_LINK_CLICK_SUPPRESSION_MS;
		},
		shouldSuppressClick() {
			return getNow() < suppressedUntil;
		},
	};
}
