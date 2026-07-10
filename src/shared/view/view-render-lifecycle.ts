export class ViewRenderLifecycle {
	private generation = 0;
	private isOpen = false;

	beginOpen(): number {
		this.isOpen = true;
		this.generation += 1;
		return this.generation;
	}

	beginClose(): number {
		this.isOpen = false;
		this.generation += 1;
		return this.generation;
	}

	capture(): number {
		return this.generation;
	}

	canRender(generation?: number): boolean {
		return this.isOpen && (generation === undefined || generation === this.generation);
	}

	canUnmount(generation: number): boolean {
		return !this.isOpen && generation === this.generation;
	}
}
