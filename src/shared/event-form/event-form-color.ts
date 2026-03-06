const DEFAULT_EVENT_COLOR_FALLBACK = '#7850FF';

export const EXTRA_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

export const resolveHexColor = (value: string): string | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('#')) {
		if (trimmed.length === 4) {
			return (
				'#' +
				trimmed
					.slice(1)
					.split('')
					.map((char) => char + char)
					.join('')
			).toUpperCase();
		}
		if (trimmed.length === 7) {
			return trimmed.toUpperCase();
		}
	}
	return null;
};

const toHex = (color: string): string => {
	if (typeof document === 'undefined') return DEFAULT_EVENT_COLOR_FALLBACK;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return DEFAULT_EVENT_COLOR_FALLBACK;
	ctx.fillStyle = color;
	const normalized = ctx.fillStyle;
	const match = normalized.match(/\d+/g);
	if (!match || match.length < 3) {
		return DEFAULT_EVENT_COLOR_FALLBACK;
	}
	const [r = 0, g = 0, b = 0] = match.slice(0, 3).map((value) => Number(value));
	const toTwo = (value: number) => value.toString(16).padStart(2, '0');
	return `#${toTwo(r)}${toTwo(g)}${toTwo(b)}`.toUpperCase();
};

export const getDefaultEventColorHex = (): string => {
	if (typeof window === 'undefined') return DEFAULT_EVENT_COLOR_FALLBACK;
	const value = getComputedStyle(document.body).getPropertyValue('--interactive-accent');
	if (!value.trim()) return DEFAULT_EVENT_COLOR_FALLBACK;
	return resolveHexColor(value) ?? toHex(value);
};

const formatHourBoundary = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export const getNextHourTaskTimeRange = (now: Date): { startTime: string; endTime: string } => {
	const startHour = (now.getHours() + 1) % 24;
	const endHour = (startHour + 1) % 24;
	return {
		startTime: formatHourBoundary(startHour),
		endTime: formatHourBoundary(endHour),
	};
};
