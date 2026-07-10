type AnyFn = (...args: never[]) => unknown;

type AroundSpec<T extends object> = {
	[K in keyof T]?: (next: AnyFn) => AnyFn;
};

export function around<T extends object>(obj: T, spec: AroundSpec<T>): () => void {
	const originals = new Map<keyof T, AnyFn>();
	const target = obj as Record<keyof T, unknown>;

	for (const key of Object.keys(spec) as Array<keyof T>) {
		const current = target[key];
		if (typeof current !== 'function') continue;
		const next = current as AnyFn;
		originals.set(key, next);
		const wrapped = spec[key]?.(next);
		if (wrapped) {
			target[key] = wrapped;
		}
	}

	return () => {
		for (const [key, fn] of originals) {
			target[key] = fn;
		}
	};
}

export const invokeAround = (fn: AnyFn, thisArg: unknown, args: unknown[] = []): unknown =>
	Reflect.apply(fn, thisArg, args);
