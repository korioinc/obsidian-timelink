type FrontmatterFieldSnapshot = {
	present: boolean;
	value: unknown;
	expectedPresent: boolean;
	expectedValue: unknown;
};

type EventFrontmatterSnapshot = Map<string, FrontmatterFieldSnapshot>;

export const createEventFrontmatterSnapshot = (): EventFrontmatterSnapshot => new Map();

export const applyEventFrontmatterWithSnapshot = (
	frontmatter: Record<string, unknown>,
	updates: Record<string, unknown>,
	snapshot: EventFrontmatterSnapshot,
): void => {
	Object.entries(updates).forEach(([key, value]) => {
		if (!snapshot.has(key)) {
			snapshot.set(key, {
				present: Object.prototype.hasOwnProperty.call(frontmatter, key),
				value: frontmatter[key],
				expectedPresent: value !== undefined,
				expectedValue: value,
			});
		}
		if (value === undefined) {
			delete frontmatter[key];
		} else {
			frontmatter[key] = value;
		}
	});
};

export const restoreEventFrontmatterSnapshot = (
	frontmatter: Record<string, unknown>,
	snapshot: EventFrontmatterSnapshot,
): boolean => {
	let fullyRestored = true;
	for (const [key, field] of snapshot) {
		const currentPresent = Object.prototype.hasOwnProperty.call(frontmatter, key);
		const stillHasWrittenValue = field.expectedPresent
			? currentPresent && Object.is(frontmatter[key], field.expectedValue)
			: !currentPresent;
		if (!stillHasWrittenValue) {
			fullyRestored = false;
			continue;
		}
		if (field.present) {
			frontmatter[key] = field.value;
		} else {
			delete frontmatter[key];
		}
	}
	return fullyRestored;
};
