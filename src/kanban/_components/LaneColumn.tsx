import type { KanbanBoard } from '../parser';
import { CardEditorInput } from './CardEditorInput';
import { isLaneDragData, readCardOrder, readLaneOrder } from './drag';
import { CheckIcon, ChevronIcon, DragIcon, MenuIcon, RemoveIcon, XIcon } from './icons';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import type { DragLocation } from '@atlaskit/pragmatic-drag-and-drop/types';
import type { App, Component } from 'obsidian';
import { MarkdownRenderer, Menu, Modal, Notice, TFile, parseLinktext } from 'obsidian';
import { h, type TargetedDragEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type LaneColumnProps = {
	markdownContext: {
		app: App;
		component: Component;
		sourcePath: string;
	};
	lane: KanbanBoard['lanes'][number];
	wrapperRef: { current: HTMLDivElement | null };
	cardHasEventById: Map<string, boolean>;
	layout?: 'board' | 'list';
	onCreateNoteFromCard: (cardId: string) => void;
	onCopyCardLink: (cardId: string) => void;
	onCreateEventFromCard: (cardId: string) => void;
	onRemoveLane: (laneId: string) => Promise<void>;
	onReorderLanes: (order: string[]) => Promise<void>;
	onUpdateLaneTitle: (laneId: string, title: string) => Promise<void>;
	onAddCard: (laneId: string, title: string) => Promise<void>;
	onRemoveCard: (cardId: string) => Promise<void>;
	onUpdateCardTitle: (cardId: string, title: string) => Promise<void>;
	onMoveCard: (cardId: string, laneId: string, index: number) => Promise<void>;
	onMoveCardFromOtherBoard: (
		payload: CrossBoardCardMovePayload,
		laneId: string,
		index: number,
	) => Promise<void>;
};

type MarkdownContext = LaneColumnProps['markdownContext'];

function CardTitle({
	title,
	markdownContext,
}: {
	title: string;
	markdownContext: MarkdownContext;
}) {
	const hostRef = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		host.innerHTML = '';
		let cancelled = false;
		const displayTitle = title.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
		void MarkdownRenderer.render(
			markdownContext.app,
			displayTitle,
			host,
			markdownContext.sourcePath,
			markdownContext.component,
		).then(() => {
			if (cancelled) return;
			host.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
				anchor.setAttribute('draggable', 'false');
			});
		});
		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			const anchor = target.closest('a');
			if (!anchor) return;
			const href = anchor.getAttribute('data-href') ?? anchor.getAttribute('href');
			if (!href) return;
			event.preventDefault();
			event.stopPropagation();
			void markdownContext.app.workspace.openLinkText(href, markdownContext.sourcePath, true);
		};
		host.addEventListener('click', handleClick);
		return () => {
			cancelled = true;
			host.removeEventListener('click', handleClick);
			host.innerHTML = '';
		};
	}, [title, markdownContext.app, markdownContext.component, markdownContext.sourcePath]);
	return <span ref={hostRef} className="block pr-6" />;
}

type ObsidianDraggable =
	| { type: 'file'; file: TFile }
	| { type: 'link'; linktext: string; file?: TFile }
	| null
	| undefined;

const getObsidianDraggable = (app: App): ObsidianDraggable => {
	return (app as unknown as { dragManager?: { draggable?: ObsidianDraggable } }).dragManager
		?.draggable;
};

type ApprovalResult = (value: boolean) => void;

class ApprovalModal extends Modal {
	private message: string;
	private onResolve: ApprovalResult;

	constructor(app: App, message: string, onResolve: ApprovalResult) {
		super(app);
		this.message = message;
		this.onResolve = onResolve;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: this.message });
		const actions = contentEl.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.onResolve(false);
			this.close();
		});
		const approveButton = actions.createEl('button', { text: 'Confirm', cls: 'mod-cta' });
		approveButton.addEventListener('click', () => {
			this.onResolve(true);
			this.close();
		});
	}

	onClose(): void {
		this.onResolve(false);
		this.contentEl.empty();
	}
}

const requestApproval = (app: App, message: string): Promise<boolean> => {
	const { promise, resolve } = (
		Promise as typeof Promise & {
			withResolvers: <T>() => {
				promise: Promise<T>;
				resolve: (value: T | PromiseLike<T>) => void;
				reject: (reason?: unknown) => void;
			};
		}
	).withResolvers<boolean>();
	const modal = new ApprovalModal(app, message, resolve);
	modal.open();
	return promise;
};

const draggableToLinks = (app: App, sourcePath: string, draggable: ObsidianDraggable): string[] => {
	if (!draggable) return [];
	switch (draggable.type) {
		case 'file':
			return [
				app.fileManager.generateMarkdownLink(
					draggable.file,
					sourcePath,
					'',
					draggable.file.basename,
				),
			];
		case 'link': {
			if (draggable.file) {
				const parsed = parseLinktext(draggable.linktext);
				const subpath = parsed?.subpath ?? '';
				return [
					app.fileManager.generateMarkdownLink(
						draggable.file,
						sourcePath,
						subpath,
						draggable.file.basename,
					),
				];
			}
			return [`[[${draggable.linktext}]]`];
		}
		default:
			return [];
	}
};

export type CrossBoardCardMovePayload = {
	sourceBoardPath: string;
	cardId: string;
	fromLaneId: string;
	fromIndex: number;
	title: string;
	blockId?: string;
};

type ActiveCardDrag = CrossBoardCardMovePayload & {
	handled: boolean;
};

const INTERNAL_CARD_DRAG_MIME = 'application/x-timelink-card';
const INTERNAL_CARD_DRAG_TEXT_PREFIX = 'timelink-card:';
let activeCardDrag: ActiveCardDrag | null = null;

const parseCardDragPayload = (
	dataTransfer: DataTransfer | null,
): CrossBoardCardMovePayload | null => {
	if (!dataTransfer) return null;
	const raw =
		dataTransfer.getData(INTERNAL_CARD_DRAG_MIME) ||
		(() => {
			const fallback = dataTransfer.getData('text/plain');
			if (!fallback.startsWith(INTERNAL_CARD_DRAG_TEXT_PREFIX)) return '';
			return fallback.slice(INTERNAL_CARD_DRAG_TEXT_PREFIX.length);
		})();
	if (!raw) {
		if (!activeCardDrag) return null;
		return {
			sourceBoardPath: activeCardDrag.sourceBoardPath,
			cardId: activeCardDrag.cardId,
			fromLaneId: activeCardDrag.fromLaneId,
			fromIndex: activeCardDrag.fromIndex,
			title: activeCardDrag.title,
			blockId: activeCardDrag.blockId,
		};
	}
	try {
		const parsed = JSON.parse(raw) as Partial<CrossBoardCardMovePayload>;
		if (
			typeof parsed.sourceBoardPath === 'string' &&
			typeof parsed.cardId === 'string' &&
			typeof parsed.fromLaneId === 'string' &&
			typeof parsed.fromIndex === 'number' &&
			typeof parsed.title === 'string'
		) {
			return {
				sourceBoardPath: parsed.sourceBoardPath,
				cardId: parsed.cardId,
				fromLaneId: parsed.fromLaneId,
				fromIndex: parsed.fromIndex,
				title: parsed.title,
				blockId: typeof parsed.blockId === 'string' ? parsed.blockId : undefined,
			};
		}
		return null;
	} catch {
		return null;
	}
};

export function LaneColumn({
	markdownContext,
	lane,
	wrapperRef,
	cardHasEventById,
	layout = 'board',
	onCreateNoteFromCard,
	onCopyCardLink,
	onCreateEventFromCard,
	onRemoveLane,
	onReorderLanes,
	onUpdateLaneTitle,
	onAddCard,
	onRemoveCard: _onRemoveCard,
	onUpdateCardTitle,
	onMoveCard,
	onMoveCardFromOtherBoard,
}: LaneColumnProps): h.JSX.Element {
	const laneRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const isSubmittingCardRef = useRef(false);
	const laneOrderRef = useRef<string[] | null>(null);
	const cardOrderRef = useRef<{ listEl: HTMLUListElement; order: string[] } | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [draftTitle, setDraftTitle] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [draftLaneTitle, setDraftLaneTitle] = useState(lane.title);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [draftCardTitle, setDraftCardTitle] = useState('');
	const isListView = layout === 'list';
	const isInteractionLocked = editingCardId !== null || isAdding || isEditingTitle;
	const cardTitleRef = useRef(new Map<string, string>());
	const isActiveDropTarget = (element: HTMLElement, targets: DragLocation['dropTargets']) =>
		targets.some((record) => record.element === element);
	const getCardTarget = (
		listEl: HTMLUListElement,
		y: number,
		draggedEl: HTMLElement,
	): HTMLElement | null => {
		const children = Array.from(listEl.querySelectorAll<HTMLElement>('li[data-card-id]'));
		for (const child of children) {
			if (child === draggedEl) continue;
			const rect = child.getBoundingClientRect();
			if (y < rect.top + rect.height / 2) {
				return child;
			}
		}
		return null;
	};
	const getDropIndexFromPointer = (listEl: HTMLUListElement, y: number): number => {
		const cards = Array.from(listEl.querySelectorAll<HTMLLIElement>('li[data-card-id]'));
		for (const [i, cardEl] of cards.entries()) {
			const rect = cardEl.getBoundingClientRect();
			if (y < rect.top + rect.height / 2) return i;
		}
		return cards.length;
	};
	const restoreOrder = (container: HTMLElement, order: string[], dataAttr: string) => {
		const doc = container.ownerDocument;
		const fragment = doc.createDocumentFragment();
		const elementById = new Map<string, HTMLElement>();
		Array.from(container.children).forEach((child) => {
			const element = child as HTMLElement;
			const id = element.getAttribute(dataAttr);
			if (!id) return;
			elementById.set(id, element);
		});
		order.forEach((id) => {
			const el = elementById.get(id);
			if (el) {
				fragment.appendChild(el);
			}
		});
		container.appendChild(fragment);
	};

	useEffect(() => {
		setDraftLaneTitle(lane.title);
	}, [lane.title]);

	useEffect(() => {
		if (!isEditingTitle) return;
		const input = laneRef.current?.querySelector<HTMLInputElement>(
			'[data-lane-title-input="true"]',
		);
		if (!input) return;
		window.setTimeout(() => input.focus(), 0);
	}, [isEditingTitle]);

	useEffect(() => {
		preventUnhandled.start();
		return () => preventUnhandled.stop();
	}, []);

	useEffect(() => {
		const wrapper = wrapperRef.current;
		const laneEl = laneRef.current;
		const handleEl = dragHandleRef.current;
		if (!wrapper || !laneEl || !handleEl) return;

		return combine(
			draggable({
				element: laneEl,
				dragHandle: handleEl,
				canDrag: ({ input }) => input.button === 0 && !isInteractionLocked,
				getInitialData: () => ({ type: 'lane', laneId: lane.id }),
				onDragStart: () => {
					laneEl.classList.add('opacity-40');
					laneOrderRef.current = readLaneOrder(wrapper);
				},
				onDrop: ({ location }) => {
					laneEl.classList.remove('opacity-40');
					if (location.current.dropTargets.length === 0 && laneOrderRef.current) {
						restoreOrder(wrapper, laneOrderRef.current, 'data-lane-id');
					}
					laneOrderRef.current = null;
				},
			}),
			dropTargetForElements({
				element: laneEl,
				canDrop: ({ source }) => isLaneDragData(source.data),
				onDrag: ({ source, location }) => {
					if (!isLaneDragData(source.data)) return;
					if (!isActiveDropTarget(laneEl, location.current.dropTargets)) return;
					const input = location.current.input;
					const draggedEl = source.element;
					if (!draggedEl || draggedEl === laneEl) return;
					const rect = laneEl.getBoundingClientRect();
					const insertBefore = isListView
						? input.clientY < rect.top + rect.height / 2
						: input.clientX < rect.left + rect.width / 2;
					const alreadyBefore = laneEl.previousSibling === draggedEl;
					const alreadyAfter = laneEl.nextSibling === draggedEl;
					if ((insertBefore && alreadyBefore) || (!insertBefore && alreadyAfter)) return;
					wrapper.insertBefore(draggedEl, insertBefore ? laneEl : laneEl.nextSibling);
				},
				onDrop: ({ source, location }) => {
					if (!isLaneDragData(source.data)) return;
					if (!isActiveDropTarget(laneEl, location.current.dropTargets)) return;
					const order = readLaneOrder(wrapper);
					void onReorderLanes(order);
				},
			}),
		);
	}, [lane.id, onReorderLanes, wrapperRef, isInteractionLocked, isListView]);

	useEffect(() => {
		const listEl = listRef.current;
		const laneEl = laneRef.current;
		if (!laneEl) return;
		const dropTarget = listEl ?? laneEl;
		const handleDragOver = (event: DragEvent) => {
			if (isInteractionLocked) return;
			const draggable = getObsidianDraggable(markdownContext.app);
			if (!draggable) return;
			const links = draggableToLinks(markdownContext.app, markdownContext.sourcePath, draggable);
			if (links.length === 0) return;
			event.preventDefault();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'copy';
			}
		};
		const handleDrop = (event: DragEvent) => {
			if (isInteractionLocked) return;
			const draggable = getObsidianDraggable(markdownContext.app);
			if (!draggable) return;
			const links = draggableToLinks(markdownContext.app, markdownContext.sourcePath, draggable);
			if (links.length === 0) return;
			event.preventDefault();
			links.forEach((link) => {
				void onAddCard(lane.id, link);
			});
		};
		dropTarget.addEventListener('dragover', handleDragOver);
		dropTarget.addEventListener('drop', handleDrop);
		return () => {
			dropTarget.removeEventListener('dragover', handleDragOver);
			dropTarget.removeEventListener('drop', handleDrop);
		};
	}, [isInteractionLocked, lane.id, markdownContext.app, markdownContext.sourcePath, onAddCard]);

	const submitLaneTitle = async () => {
		const title = draftLaneTitle.trim();
		if (!title) return;
		await onUpdateLaneTitle(lane.id, title);
		setIsEditingTitle(false);
	};

	const cancelLaneTitle = () => {
		setDraftLaneTitle(lane.title);
		setIsEditingTitle(false);
	};

	const submitCard = async (nextValue?: string) => {
		if (isSubmittingCardRef.current) return;
		const title = (nextValue ?? draftTitle).replace(/\r\n/g, '\n').trim();
		if (!title) return;
		isSubmittingCardRef.current = true;
		try {
			await onAddCard(lane.id, title);
			setDraftTitle('');
			setIsAdding(false);
		} finally {
			isSubmittingCardRef.current = false;
		}
	};

	const cancelCard = () => {
		setDraftTitle('');
		setIsAdding(false);
	};

	const startEditCard = (cardId: string, title: string) => {
		setEditingCardId(cardId);
		setDraftCardTitle(title);
	};

	const submitCardEdit = async (nextValue?: string) => {
		if (!editingCardId) return;
		const title = (nextValue ?? draftCardTitle).replace(/\r\n/g, '\n').trim();
		if (!title) return;
		const cardId = editingCardId;
		await onUpdateCardTitle(cardId, title);
		setEditingCardId(null);
		setDraftCardTitle('');
		cardTitleRef.current.delete(cardId);
	};

	const cancelCardEdit = (cardId: string, fallbackTitle: string) => {
		const originalTitle = cardTitleRef.current.get(cardId) ?? fallbackTitle;
		setDraftCardTitle(originalTitle);
		setEditingCardId(null);
		cardTitleRef.current.delete(cardId);
	};

	const openCardMenu = (event: MouseEvent, cardId: string, title: string) => {
		event.preventDefault();
		event.stopPropagation();
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle('Edit card').onClick(() => {
				cardTitleRef.current.set(cardId, title);
				startEditCard(cardId, title);
			});
		});
		menu.addItem((item) => {
			item.setTitle('New note from card').onClick(() => {
				onCreateNoteFromCard(cardId);
			});
		});
		menu.addItem((item) => {
			item.setTitle('Copy link to card').onClick(() => {
				onCopyCardLink(cardId);
				new Notice('Card link copied to clipboard.');
			});
		});
		menu.addItem((item) => {
			item.setTitle('Create event from card').onClick(() => {
				onCreateEventFromCard(cardId);
			});
		});
		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle('Delete card').onClick(() => {
				void (async () => {
					const ok = await requestApproval(markdownContext.app, 'Delete this card?');
					if (!ok) return;
					await _onRemoveCard(cardId);
				})();
			});
		});
		menu.showAtMouseEvent(event);
	};

	const handleCardDragOver = (event: TargetedDragEvent<HTMLUListElement>) => {
		if (isInteractionLocked) return;
		const payload = parseCardDragPayload(event.dataTransfer);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
		const listEl = listRef.current;
		if (!listEl) return;
		const isSameBoard = payload.sourceBoardPath === markdownContext.sourcePath;
		if (!isSameBoard) {
			return;
		}
		const scope = wrapperRef.current ?? listEl;
		const draggedEl = Array.from(scope.querySelectorAll<HTMLLIElement>('li[data-card-id]')).find(
			(element) =>
				element.dataset.cardId === payload.cardId && element.dataset.laneId === payload.fromLaneId,
		);
		if (!draggedEl) return;
		if (draggedEl.parentElement !== listEl) {
			listEl.appendChild(draggedEl);
		}
		const target = getCardTarget(listEl, event.clientY, draggedEl);
		if (target) {
			if (target.previousSibling !== draggedEl) {
				listEl.insertBefore(draggedEl, target);
			}
		} else if (listEl.lastElementChild !== draggedEl) {
			listEl.appendChild(draggedEl);
		}
	};

	const handleCardDrop = (event: TargetedDragEvent<HTMLUListElement>) => {
		if (isInteractionLocked) return;
		const payload = parseCardDragPayload(event.dataTransfer);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		const listEl = listRef.current;
		if (!listEl) return;
		const isSameBoard = payload.sourceBoardPath === markdownContext.sourcePath;
		const index = isSameBoard
			? (() => {
					const order = readCardOrder(listEl);
					return order.indexOf(payload.cardId);
				})()
			: getDropIndexFromPointer(listEl, event.clientY);
		if (index < 0) return;
		if (
			activeCardDrag &&
			activeCardDrag.sourceBoardPath === payload.sourceBoardPath &&
			activeCardDrag.cardId === payload.cardId &&
			activeCardDrag.fromLaneId === payload.fromLaneId
		) {
			activeCardDrag.handled = true;
		}
		if (isSameBoard) {
			if (payload.fromLaneId === lane.id && payload.fromIndex === index) return;
			void onMoveCard(payload.cardId, lane.id, index);
			return;
		}
		void onMoveCardFromOtherBoard(payload, lane.id, index);
	};

	return (
		<div
			ref={laneRef}
			className={
				isListView
					? 'w-full max-w-none min-w-0 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] py-2'
					: 'w-[260px] max-w-[320px] min-w-[260px] flex-none rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] py-2'
			}
			data-lane-id={lane.id}
		>
			<div className="flex items-center gap-1 px-1.5 pb-1">
				<div
					ref={dragHandleRef}
					role="button"
					tabIndex={0}
					className="inline-flex cursor-grab items-center justify-center rounded-md p-0.5 text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
					title="Drag to reorder"
				>
					<DragIcon className="h-6 w-6" />
				</div>
				<div
					role="button"
					tabIndex={0}
					className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
					aria-label={isCollapsed ? 'Expand list' : 'Collapse list'}
					onClick={() => setIsCollapsed((prev) => !prev)}
				>
					<ChevronIcon
						className={
							isCollapsed
								? 'h-4 w-4 rotate-180 transition-transform'
								: 'h-4 w-4 transition-transform'
						}
					/>
				</div>
				{isEditingTitle ? (
					<input
						data-lane-title-input="true"
						className="h-7 w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 text-xs font-semibold tracking-wide text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
						value={draftLaneTitle}
						onInput={(event) => setDraftLaneTitle(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void submitLaneTitle();
							} else if (event.key === 'Escape') {
								event.preventDefault();
								cancelLaneTitle();
							}
						}}
					/>
				) : (
					<div
						className="cursor-text text-xs font-semibold tracking-wide text-[color:var(--text-normal)] select-text"
						onDblClick={() => setIsEditingTitle(true)}
					>
						{lane.title}
					</div>
				)}
				<div className="ml-auto flex gap-1">
					{!isEditingTitle && (
						<span className="self-center text-xs font-semibold text-[color:var(--text-muted)]">
							{lane.cards.length}
						</span>
					)}
					{isEditingTitle ? (
						<>
							<div
								role="button"
								tabIndex={0}
								className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
								aria-label="Save title"
								onClick={() => void submitLaneTitle()}
							>
								<CheckIcon className="h-4 w-4" />
							</div>
							<div
								role="button"
								tabIndex={0}
								className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
								aria-label="Cancel"
								onClick={cancelLaneTitle}
							>
								<XIcon className="h-4 w-4" />
							</div>
						</>
					) : (
						<div
							role="button"
							tabIndex={0}
							className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
							onClick={() => {
								void (async () => {
									const ok = await requestApproval(
										markdownContext.app,
										`Remove List "${lane.title}"?`,
									);
									if (!ok) return;
									await onRemoveLane(lane.id);
								})();
							}}
						>
							<RemoveIcon className="h-4 w-4" />
						</div>
					)}
				</div>
			</div>
			<div className="my-1 border-b border-[var(--background-modifier-border)]" />
			{!isCollapsed && (
				<ul
					ref={listRef}
					className="m-0 flex list-none flex-col gap-2 px-1.5 py-1"
					data-lane-id={lane.id}
					onDragOver={handleCardDragOver}
					onDrop={handleCardDrop}
				>
					{lane.cards.map((card, index) => (
						<li
							key={card.id}
							className="cursor-grab rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
							data-card-id={card.id}
							data-lane-id={lane.id}
							data-index={String(index)}
							draggable={!isInteractionLocked}
							onDragStart={(event) => {
								if (isInteractionLocked) {
									event.preventDefault();
									return;
								}
								const listEl = listRef.current;
								if (listEl) {
									cardOrderRef.current = { listEl, order: readCardOrder(listEl) };
								}
								activeCardDrag = {
									sourceBoardPath: markdownContext.sourcePath,
									cardId: card.id,
									fromLaneId: lane.id,
									fromIndex: index,
									title: card.title,
									blockId: card.blockId,
									handled: false,
								};
								event.currentTarget.classList.add('opacity-40');
								if (event.dataTransfer) {
									const payload: CrossBoardCardMovePayload = {
										sourceBoardPath: markdownContext.sourcePath,
										cardId: card.id,
										fromLaneId: lane.id,
										fromIndex: index,
										title: card.title,
										blockId: card.blockId,
									};
									const serialized = JSON.stringify(payload);
									event.dataTransfer.setData(INTERNAL_CARD_DRAG_MIME, serialized);
									event.dataTransfer.setData(
										'text/plain',
										`${INTERNAL_CARD_DRAG_TEXT_PREFIX}${serialized}`,
									);
									event.dataTransfer.effectAllowed = 'copyMove';
								}
							}}
							onDragEnd={(event) => {
								event.currentTarget.classList.remove('opacity-40');
								if (
									activeCardDrag &&
									activeCardDrag.sourceBoardPath === markdownContext.sourcePath &&
									activeCardDrag.cardId === card.id &&
									activeCardDrag.fromLaneId === lane.id
								) {
									if (!activeCardDrag.handled && cardOrderRef.current) {
										restoreOrder(
											cardOrderRef.current.listEl,
											cardOrderRef.current.order,
											'data-card-id',
										);
									}
									activeCardDrag = null;
								}
								cardOrderRef.current = null;
							}}
							onDblClick={() => {
								cardTitleRef.current.set(card.id, card.title);
								startEditCard(card.id, card.title);
							}}
						>
							{editingCardId === card.id ? (
								<CardEditorInput
									markdownContext={markdownContext}
									value={draftCardTitle}
									onChange={setDraftCardTitle}
									onSubmit={(nextValue) => void submitCardEdit(nextValue)}
									onCancel={() => cancelCardEdit(card.id, card.title)}
									containerClassName="flex items-center gap-1.5"
									inputClassName="h-6 w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[9px] text-[color:var(--text-normal)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--text-accent)]"
									contentStyle={{
										padding: '4px 8px',
										lineHeight: '14px',
										fontSize: '10px',
									}}
									buttonSize="sm"
								/>
							) : (
								<div className="relative">
									<div className="flex items-center gap-1">
										{layout === 'board' && cardHasEventById.get(card.id) === true && (
											<span className="shrink-0 align-middle leading-none" aria-hidden="true">
												🗓️
											</span>
										)}
										<CardTitle title={card.title} markdownContext={markdownContext} />
									</div>
									<span
										role="button"
										tabIndex={0}
										className="absolute top-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-sm text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
										aria-label="More options"
										onClick={(event) => openCardMenu(event, card.id, card.title)}
										onKeyDown={(event) => {
											if (event.key === 'Enter' || event.key === ' ') {
												event.preventDefault();
												openCardMenu(event as unknown as MouseEvent, card.id, card.title);
											}
										}}
									>
										<MenuIcon size={14} />
									</span>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
			{!isCollapsed &&
				(isAdding ? (
					<>
						<div className="my-1 border-b border-[var(--background-modifier-border)]" />
						<div className="px-1.5">
							<div className="mt-2 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-2">
								<CardEditorInput
									markdownContext={markdownContext}
									value={draftTitle}
									onChange={setDraftTitle}
									onSubmit={(nextValue) => void submitCard(nextValue)}
									onCancel={cancelCard}
									placeholder="Card title"
									containerClassName="flex items-center gap-2"
									inputClassName="h-6 w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-xs text-[color:var(--text-normal)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--text-accent)]"
									actionContainerClassName="flex items-center gap-2"
									buttonSize="sm"
									contentStyle={{
										padding: '4px 10px',
										lineHeight: '14px',
										fontSize: '12px',
									}}
								/>
							</div>
						</div>
					</>
				) : (
					<>
						<div className="my-1 border-b border-[var(--background-modifier-border)]" />
						<div className="px-1.5">
							<button
								type="button"
								className="mt-1 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-xs font-semibold text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
								onClick={() => setIsAdding(true)}
							>
								<span className="inline-flex items-center justify-center font-semibold">+</span>
								<span>Add card</span>
							</button>
						</div>
					</>
				))}
		</div>
	);
}
