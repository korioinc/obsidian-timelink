import { CheckIcon, XIcon } from './icons';
import type { App, Component } from 'obsidian';
import { h, type CSSProperties } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

type ActionButtonSize = 'xs' | 'sm' | 'card' | 'md';

type CardEditorInputProps = {
	markdownContext: {
		app: App;
		component: Component;
		sourcePath: string;
	};
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	onCancel: () => void;
	placeholder?: string;
	containerClassName?: string;
	inputClassName?: string;
	inputStyle?: CSSProperties;
	contentStyle?: Record<string, string>;
	buttonSize?: ActionButtonSize;
	actionContainerClassName?: string;
	autoFocus?: boolean;
};

const buttonClassBySize: Record<ActionButtonSize, string> = {
	xs: 'h-5 w-5 rounded-sm',
	sm: 'h-6 w-6 rounded-sm',
	card: 'h-4 w-4 rounded-sm',
	md: 'h-10 w-10 rounded-md',
};

const iconSizeByButton: Record<ActionButtonSize, number> = {
	xs: 12,
	sm: 14,
	card: 12,
	md: 22,
};

const handleActionKey = (handler: () => void) => (event: KeyboardEvent) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handler();
	}
};

const stopPointer = (event: Event) => {
	event.stopPropagation();
};

export function CardEditorInput({
	markdownContext,
	value,
	onChange,
	onSubmit,
	onCancel,
	placeholder,
	containerClassName,
	inputClassName,
	inputStyle,
	contentStyle,
	buttonSize = 'md',
	actionContainerClassName,
	autoFocus = true,
}: CardEditorInputProps): h.JSX.Element {
	void markdownContext;
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const onChangeRef = useRef(onChange);
	const onSubmitRef = useRef(onSubmit);
	const onCancelRef = useRef(onCancel);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	useEffect(() => {
		onCancelRef.current = onCancel;
	}, [onCancel]);

	const resizeToFit = () => {
		const input = inputRef.current;
		if (!input) return;
		input.setCssProps({ height: 'auto' });
		input.setCssProps({ height: `${input.scrollHeight}px` });
	};

	useLayoutEffect(() => {
		resizeToFit();
	}, [value, contentStyle, inputStyle]);

	useEffect(() => {
		if (!autoFocus) return;
		inputRef.current?.focus();
	}, [autoFocus]);

	const getCurrentValue = () => inputRef.current?.value ?? value ?? '';

	return (
		<div className={containerClassName} data-card-input="true" draggable={false}>
			<textarea
				ref={inputRef}
				className={inputClassName}
				style={{
					overflow: 'hidden',
					resize: 'none',
					display: 'block',
					boxSizing: 'border-box',
					...(inputStyle ?? {}),
					...(contentStyle ?? {}),
				}}
				rows={1}
				placeholder={placeholder}
				value={value}
				draggable={false}
				onMouseDown={(event) => event.stopPropagation()}
				onPointerDown={(event) => event.stopPropagation()}
				onDragStart={(event) => {
					event.stopPropagation();
					event.preventDefault();
				}}
				onInput={(event) => {
					const nextValue = event.currentTarget.value;
					onChangeRef.current(nextValue);
					resizeToFit();
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						onSubmitRef.current(getCurrentValue());
						return;
					}
					if (event.key === 'Escape') {
						event.preventDefault();
						onCancelRef.current();
					}
				}}
			/>
			<div
				className={actionContainerClassName ?? 'flex items-center gap-2'}
				data-card-input-actions="true"
				draggable={false}
			>
				<div
					role="button"
					tabIndex={0}
					className={`${buttonClassBySize[buttonSize]} inline-flex items-center justify-center border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]`}
					aria-label="Save"
					draggable={false}
					onMouseDown={stopPointer}
					onPointerDown={stopPointer}
					onClick={() => onSubmit(getCurrentValue())}
					onKeyDown={handleActionKey(() => onSubmit(getCurrentValue()))}
				>
					<CheckIcon size={iconSizeByButton[buttonSize]} />
				</div>
				<div
					role="button"
					tabIndex={0}
					className={`${buttonClassBySize[buttonSize]} inline-flex items-center justify-center border border-[var(--background-modifier-border)] bg-transparent text-[color:var(--text-muted)] hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]`}
					aria-label="Cancel"
					draggable={false}
					onMouseDown={stopPointer}
					onPointerDown={stopPointer}
					onClick={onCancel}
					onKeyDown={handleActionKey(onCancel)}
				>
					<XIcon size={iconSizeByButton[buttonSize]} />
				</div>
			</div>
		</div>
	);
}
