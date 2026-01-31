import { h } from 'preact';

type IconProps = {
	size?: number;
	className?: string;
};

export function DragIcon({ size = 22, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M6 7h12M6 12h12M6 17h12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function RemoveIcon({ size = 18, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M6 6l12 12M18 6l-12 12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function CheckIcon({ size = 22, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M20 6L9 17l-5-5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function XIcon({ size = 22, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M6 6l12 12M18 6l-12 12"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function ChevronIcon({ size = 22, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M6 9l6 6 6-6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function MenuIcon({ size = 18, className }: IconProps): h.JSX.Element {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
			<path
				d="M6 12h.01M12 12h.01M18 12h.01"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
