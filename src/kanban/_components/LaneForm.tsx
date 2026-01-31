import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type AddLaneFormProps = {
	onSubmit: (title: string) => Promise<void>;
	onCancel: () => void;
};

export function AddLaneForm({ onSubmit, onCancel }: AddLaneFormProps): h.JSX.Element {
	const [title, setTitle] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (formRef.current?.contains(target)) return;
			onCancel();
		};

		document.addEventListener('mousedown', handlePointerDown, true);
		return () => document.removeEventListener('mousedown', handlePointerDown, true);
	}, [onCancel]);

	const submit = async () => {
		if (isSubmitting) return;
		const trimmed = title.trim();
		if (!trimmed) return;
		setIsSubmitting(true);
		await onSubmit(trimmed);
		setTitle('');
		setIsSubmitting(false);
		onCancel();
	};

	return (
		<div
			ref={formRef}
			className="w-full max-w-md rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-4 py-3 shadow-lg"
		>
			<div className="flex flex-col gap-2">
				<input
					ref={inputRef}
					type="text"
					placeholder="List title"
					className="h-9 w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-3 text-xs text-[color:var(--text-normal)] placeholder:text-[color:var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
					value={title}
					onInput={(event) => setTitle(event.currentTarget.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void submit();
						} else if (event.key === 'Escape') {
							event.preventDefault();
							onCancel();
						}
					}}
				/>
				<div className="flex items-center justify-end gap-2">
					<button
						type="button"
						className="timelink-add-list-submit h-8 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 text-[11px] font-semibold text-[color:var(--text-muted)] hover:border-[var(--background-modifier-border-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
						onClick={() => void submit()}
					>
						Add list
					</button>
					<button
						type="button"
						className="h-8 rounded-md border border-[var(--background-modifier-border)] bg-transparent px-3 text-[11px] font-semibold text-[color:var(--text-muted)] hover:border-[var(--background-modifier-border-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
						onClick={onCancel}
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}
