import { PreactModal } from '../../ui/PreactModal';
import { EventFormContainer } from './EventFormContainer';
import type { EventFormDraft, EventFormProps } from './event-form-types';
import type { App } from 'obsidian';

export type { EventFormDraft, EventFormProps };

export class EventFormModal {
	private modal: PreactModal;
	private props: EventFormProps;
	private closeFn: (() => void) | null = null;
	private backdropPointerDown = false;

	constructor(app: App, props: EventFormProps) {
		this.props = props;
		this.modal = new PreactModal(app, (close) => {
			this.closeFn = close;
			return this.renderModal(close);
		});
	}

	private handleRequestClose = () => {
		this.props.onClose();
		this.closeFn?.();
	};

	private renderModal(close: () => void) {
		const mergedProps = { ...this.props, onClose: this.handleRequestClose };
		const requestClose = () => {
			mergedProps.onClose();
			close();
		};

		return (
			<div
				data-timelink-modal={mergedProps.headerTitle === 'Edit event' ? 'edit' : 'create'}
				className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--background-modifier-border)]"
				style={{
					backgroundColor: 'color-mix(in srgb, var(--background-primary) 55%, transparent)',
				}}
				onPointerDown={(event) => {
					this.backdropPointerDown = event.target === event.currentTarget;
				}}
				onClick={(event) => {
					if (event.target !== event.currentTarget) return;
					if (!this.backdropPointerDown) return;
					requestClose();
				}}
				onKeyDown={(event) => {
					if (event.key !== 'Escape') return;
					event.stopPropagation();
					requestClose();
				}}
				tabIndex={-1}
			>
				<div
					className="relative w-[720px] max-w-[90vw] rounded-lg bg-[var(--background-primary)] p-6 pt-8 text-[color:var(--text-normal)]"
					style={{
						border: '1px solid',
						borderColor: 'color-mix(in srgb, var(--background-modifier-border) 60%, transparent)',
					}}
					onClick={(event) => event.stopPropagation()}
				>
					<EventFormContainer
						{...mergedProps}
						onClose={requestClose}
						noteAction={
							mergedProps.noteAction
								? () => {
										mergedProps.noteAction?.();
										requestClose();
									}
								: undefined
						}
					/>
				</div>
			</div>
		);
	}

	updateProps(nextProps: EventFormProps) {
		this.props = nextProps;
		const close = this.closeFn;
		if (!close) return;
		this.modal.renderNode(this.renderModal(close));
	}

	open() {
		this.modal.open();
	}

	close() {
		this.modal.close();
	}
}
