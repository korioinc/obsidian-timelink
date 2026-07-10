export const mapWithConcurrency = async <T, TResult>(
	items: readonly T[],
	concurrency: number,
	mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> => {
	if (items.length === 0) return [];
	const workerCount = Math.max(1, Math.min(Math.floor(concurrency), items.length));
	const results = new Array<TResult>(items.length);
	let nextIndex = 0;

	const runWorker = async (): Promise<void> => {
		while (nextIndex < items.length) {
			const index = nextIndex;
			nextIndex += 1;
			const item = items[index];
			if (item === undefined && !(index in items)) continue;
			results[index] = await mapper(item as T, index);
		}
	};

	await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
	return results;
};
