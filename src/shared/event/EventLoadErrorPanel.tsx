type EventLoadErrorPanelProps = {
	message: string;
};

export const EventLoadErrorPanel = ({ message }: EventLoadErrorPanelProps) => (
	<div className="mx-auto mt-16 max-w-md border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-6 text-center text-sm text-[color:var(--text-muted)]">
		{message}
	</div>
);
