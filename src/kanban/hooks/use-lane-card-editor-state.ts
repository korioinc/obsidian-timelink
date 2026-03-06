import { useEffect, useRef, useState } from 'preact/hooks';

type UseLaneCardEditorStateParams = {
	laneId: string;
	laneTitle: string;
	onUpdateLaneTitle: (laneId: string, title: string) => Promise<void>;
	onAddCard: (laneId: string, title: string) => Promise<void>;
	onUpdateCardTitle: (cardId: string, title: string) => Promise<void>;
};

export function normalizeCardTitle(value: string): string {
	return value.replace(/\r\n/g, '\n').trim();
}

export function useLaneCardEditorState({
	laneId,
	laneTitle,
	onUpdateLaneTitle,
	onAddCard,
	onUpdateCardTitle,
}: UseLaneCardEditorStateParams) {
	const isSubmittingCardRef = useRef(false);
	const cardTitleRef = useRef(new Map<string, string>());
	const [isAdding, setIsAdding] = useState(false);
	const [draftTitle, setDraftTitle] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [draftLaneTitle, setDraftLaneTitle] = useState(laneTitle);
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [draftCardTitle, setDraftCardTitle] = useState('');

	useEffect(() => {
		setDraftLaneTitle(laneTitle);
	}, [laneTitle]);

	const submitLaneTitle = async () => {
		const title = draftLaneTitle.trim();
		if (!title) return;
		await onUpdateLaneTitle(laneId, title);
		setIsEditingTitle(false);
	};

	const cancelLaneTitle = () => {
		setDraftLaneTitle(laneTitle);
		setIsEditingTitle(false);
	};

	const submitCard = async (nextValue?: string) => {
		if (isSubmittingCardRef.current) return;
		const title = normalizeCardTitle(nextValue ?? draftTitle);
		if (!title) return;
		isSubmittingCardRef.current = true;
		try {
			await onAddCard(laneId, title);
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
		const title = normalizeCardTitle(nextValue ?? draftCardTitle);
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

	const isInteractionLocked = editingCardId !== null || isAdding || isEditingTitle;

	return {
		cardTitleRef,
		isAdding,
		setIsAdding,
		draftTitle,
		setDraftTitle,
		isEditingTitle,
		setIsEditingTitle,
		draftLaneTitle,
		setDraftLaneTitle,
		editingCardId,
		draftCardTitle,
		setDraftCardTitle,
		isInteractionLocked,
		submitLaneTitle,
		cancelLaneTitle,
		submitCard,
		cancelCard,
		startEditCard,
		submitCardEdit,
		cancelCardEdit,
	};
}
