type PointerMoveHandler = (event: PointerEvent) => void;
type PointerUpHandler = ((event: PointerEvent) => void) | (() => void);

export const registerWindowPointerMoveAndUp = (
	handlePointerMove: PointerMoveHandler,
	handlePointerUp: PointerUpHandler,
): (() => void) => {
	const pointerUpHandler = handlePointerUp as EventListener;
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', pointerUpHandler, { once: true });
	return () => {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', pointerUpHandler);
	};
};
