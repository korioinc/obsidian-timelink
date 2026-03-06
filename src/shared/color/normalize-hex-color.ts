export const normalizeHexColor = (value?: string | null): string | null => {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (!trimmed.startsWith('#')) return null;
	const upper = trimmed.toUpperCase();
	if (upper.length === 4) {
		return (
			'#' +
			upper
				.slice(1)
				.split('')
				.map((char) => char + char)
				.join('')
		);
	}
	if (upper.length === 7) return upper;
	return null;
};
