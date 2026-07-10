export class MinHeap<T> {
	private readonly values: T[] = [];

	constructor(private readonly compare: (left: T, right: T) => number) {}

	peek(): T | undefined {
		return this.values[0];
	}

	push(value: T): void {
		this.values.push(value);
		let index = this.values.length - 1;
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			const parent = this.values[parentIndex]!;
			if (this.compare(value, parent) >= 0) break;
			this.values[index] = parent;
			index = parentIndex;
		}
		this.values[index] = value;
	}

	pop(): T | undefined {
		if (this.values.length === 0) return undefined;
		const root = this.values[0]!;
		const last = this.values.pop()!;
		if (this.values.length === 0) return root;

		let index = 0;
		while (true) {
			const leftIndex = index * 2 + 1;
			if (leftIndex >= this.values.length) break;
			const rightIndex = leftIndex + 1;
			const smallerChildIndex =
				rightIndex < this.values.length &&
				this.compare(this.values[rightIndex]!, this.values[leftIndex]!) < 0
					? rightIndex
					: leftIndex;
			const child = this.values[smallerChildIndex]!;
			if (this.compare(last, child) <= 0) break;
			this.values[index] = child;
			index = smallerChildIndex;
		}
		this.values[index] = last;
		return root;
	}
}
