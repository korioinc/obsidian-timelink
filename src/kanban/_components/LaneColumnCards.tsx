import type { KanbanBoard } from '../types';
import { CardEditorInput } from './CardEditorInput';
import { CardTitleRenderer, type CardTitleMarkdownContext } from './CardTitleRenderer';
import { MenuIcon } from './icons';
import { h } from 'preact';

type LaneColumnCardsProps = {
	markdownContext: CardTitleMarkdownContext;
	lane: KanbanBoard['lanes'][number];
	layout: 'board' | 'list';
	cardHasEventById: Map<string, boolean>;
	listRef: { current: HTMLUListElement | null };
	isCardDragging: boolean;
	isInteractionLocked: boolean;
	editingCardId: string | null;
	draftCardTitle: string;
	setDraftCardTitle: (value: string) => void;
	submitCardEdit: (nextValue?: string) => Promise<void>;
	cancelCardEdit: (cardId: string, fallbackTitle: string) => void;
	startEditCard: (cardId: string, title: string) => void;
	cardTitleRef: { current: Map<string, string> };
	openCardOptions: (event: MouseEvent, cardId: string, title: string) => void;
	handleCardDragOver: (event: DragEvent) => void;
	handleCardDrop: (event: DragEvent) => void;
	handleCardDragStart: (
		event: DragEvent,
		card: KanbanBoard['lanes'][number]['cards'][number],
		index: number,
	) => void;
	handleCardDragEnd: (event: DragEvent, cardId: string) => void;
	isAdding: boolean;
	setIsAdding: (value: boolean) => void;
	draftTitle: string;
	setDraftTitle: (value: string) => void;
	submitCard: (nextValue?: string) => Promise<void>;
	cancelCard: () => void;
};

export const LaneColumnCards = ({
	markdownContext,
	lane,
	layout,
	cardHasEventById,
	listRef,
	isCardDragging,
	isInteractionLocked,
	editingCardId,
	draftCardTitle,
	setDraftCardTitle,
	submitCardEdit,
	cancelCardEdit,
	startEditCard,
	cardTitleRef,
	openCardOptions,
	handleCardDragOver,
	handleCardDrop,
	handleCardDragStart,
	handleCardDragEnd,
	isAdding,
	setIsAdding,
	draftTitle,
	setDraftTitle,
	submitCard,
	cancelCard,
}: LaneColumnCardsProps): h.JSX.Element => {
	return (
		<>
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
						className={`cursor-grab rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap text-[color:var(--text-normal)] ${
							isCardDragging
								? ''
								: 'hover:border-[var(--background-modifier-border-hover)] hover:bg-[var(--background-modifier-hover)]'
						} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]`}
						data-card-id={card.id}
						data-lane-id={lane.id}
						data-index={String(index)}
						draggable={!isInteractionLocked}
						onDragStart={(event) => handleCardDragStart(event, card, index)}
						onDragEnd={(event) => handleCardDragEnd(event, card.id)}
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
									<CardTitleRenderer title={card.title} markdownContext={markdownContext} />
								</div>
								<span
									role="button"
									tabIndex={0}
									className="absolute top-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-sm text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)]"
									aria-label="More options"
									onClick={(event) => openCardOptions(event, card.id, card.title)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											openCardOptions(event as unknown as MouseEvent, card.id, card.title);
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
			{isAdding ? (
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
			)}
		</>
	);
};
