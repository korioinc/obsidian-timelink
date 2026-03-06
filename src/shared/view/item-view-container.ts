const resolveItemViewContentContainer = (containerEl: HTMLElement): HTMLElement | null => {
	const candidate = containerEl.children.item(1);
	return candidate instanceof HTMLElement ? candidate : null;
};

export const prepareItemViewContentContainer = (containerEl: HTMLElement): HTMLElement | null => {
	const container = resolveItemViewContentContainer(containerEl);
	if (!container) return null;
	container.empty();
	return container;
};

export const withItemViewContentUnmount = (
	containerEl: HTMLElement,
	unmount: (container: HTMLElement) => void,
): void => {
	const container = resolveItemViewContentContainer(containerEl);
	if (!container) return;
	unmount(container);
};
