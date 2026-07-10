type MutablePathTarget = {
	path: string;
};

type EventModificationTransactionOptions = {
	target: MutablePathTarget;
	sourcePath: string;
	nextPath: string;
	rename: (path: string) => Promise<void>;
	writeFrontmatter: () => Promise<void>;
	syncBacklink: () => Promise<void>;
	restoreBacklink: () => Promise<void>;
	restoreEvent: () => Promise<void>;
	onCommitted: (path: string) => void;
	onRollbackFailed: (currentPath: string) => void;
};

class EventModificationRollbackError extends Error {
	readonly eventStateUncertain = true;

	constructor(
		readonly originalError: unknown,
		readonly rollbackErrors: unknown[],
	) {
		super('The event modification failed and could not be fully rolled back.');
		this.name = 'EventModificationRollbackError';
	}
}

const attemptRollback = async (
	rollback: () => Promise<void>,
	rollbackErrors: unknown[],
): Promise<void> => {
	try {
		await rollback();
	} catch (rollbackError) {
		rollbackErrors.push(rollbackError);
	}
};

const rollbackEventModification = async (
	error: unknown,
	options: Pick<
		EventModificationTransactionOptions,
		'target' | 'sourcePath' | 'rename' | 'restoreBacklink' | 'restoreEvent' | 'onRollbackFailed'
	>,
	state: { backlinkStarted: boolean; frontmatterStarted: boolean },
): Promise<void> => {
	const rollbackErrors: unknown[] = [];
	if (state.backlinkStarted) {
		await attemptRollback(options.restoreBacklink, rollbackErrors);
	}
	if (state.frontmatterStarted) {
		await attemptRollback(options.restoreEvent, rollbackErrors);
	}
	if (options.target.path !== options.sourcePath) {
		await attemptRollback(() => options.rename(options.sourcePath), rollbackErrors);
	}
	if (rollbackErrors.length === 0) return;

	try {
		options.onRollbackFailed(options.target.path);
	} catch (rollbackError) {
		rollbackErrors.push(rollbackError);
	}
	throw new EventModificationRollbackError(error, rollbackErrors);
};

export const runEventModificationTransaction = async ({
	target,
	sourcePath,
	nextPath,
	rename,
	writeFrontmatter,
	syncBacklink,
	restoreBacklink,
	restoreEvent,
	onCommitted,
	onRollbackFailed,
}: EventModificationTransactionOptions): Promise<void> => {
	let frontmatterStarted = false;
	let backlinkStarted = false;

	try {
		if (target.path !== nextPath) {
			await rename(nextPath);
		}
		frontmatterStarted = true;
		await writeFrontmatter();
		backlinkStarted = true;
		await syncBacklink();
		onCommitted(nextPath);
	} catch (error) {
		await rollbackEventModification(
			error,
			{ target, sourcePath, rename, restoreBacklink, restoreEvent, onRollbackFailed },
			{ backlinkStarted, frontmatterStarted },
		);
		throw error;
	}
};
