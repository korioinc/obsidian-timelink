type GanttStatePanelProps = {
	message: string;
	tone?: 'default' | 'error';
};

export const GanttStatePanel = ({ message, tone = 'default' }: GanttStatePanelProps) => {
	const borderColor =
		tone === 'error'
			? 'border-[var(--background-modifier-error)]'
			: 'border-[var(--background-modifier-border)]';
	const textColor =
		tone === 'error' ? 'text-[color:var(--text-error)]' : 'text-[color:var(--text-muted)]';

	return (
		<div className="p-4">
			<div className={`rounded-lg border border-dashed ${borderColor} p-4 text-sm ${textColor}`}>
				{message}
			</div>
		</div>
	);
};
