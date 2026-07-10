type PointerMoveHandler = (event: PointerEvent) => void;
type PointerUpHandler = ((event: PointerEvent) => void) | (() => void);

export const registerWindowPointerMoveAndUp = (
	handlePointerMove: PointerMoveHandler,
	handlePointerUp: PointerUpHandler,
): (() => void) => {
	let finalized = false;
	const finalize = (event: PointerEvent) => {
		if (finalized) return;
		finalized = true;
		handlePointerUp(event);
	};
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', finalize, { once: true });
	window.addEventListener('pointercancel', finalize, { once: true });
	return () => {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', finalize);
		window.removeEventListener('pointercancel', finalize);
	};
};
