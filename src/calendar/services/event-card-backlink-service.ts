import {
	type FrontmatterFileLike,
	type FrontmatterMetadataApp,
	type FrontmatterMutationApp,
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { resolveLinkedCardFileFromFrontmatter } from './linked-card-service';

type Frontmatter = Record<string, unknown> | null | undefined;
type EventLinkFile = {
	path: string;
};
type BacklinkApp = FrontmatterMetadataApp &
	FrontmatterMutationApp & {
		metadataCache: FrontmatterMetadataApp['metadataCache'] & {
			getFirstLinkpathDest(path: string, sourcePath: string): FrontmatterFileLike | null;
		};
		fileManager: FrontmatterMutationApp['fileManager'] & {
			generateMarkdownLink(
				file: EventLinkFile,
				sourcePath: string,
				subpath: string,
				alias: string,
			): string;
		};
	};

type SyncLinkedCardEventBacklinkParams = {
	app: BacklinkApp;
	eventFile: EventLinkFile;
	sourcePath: string;
	eventTitle: string;
	frontmatter: Frontmatter;
	rollbackSnapshot?: LinkedCardEventBacklinkSnapshot;
};

type LinkedCardEventBacklinkSnapshot = {
	file: FrontmatterFileLike | null;
	captured: boolean;
	present: boolean;
	value: unknown;
	expectedValue: unknown;
};

export const createLinkedCardEventBacklinkSnapshot = (): LinkedCardEventBacklinkSnapshot => ({
	file: null,
	captured: false,
	present: false,
	value: undefined,
	expectedValue: undefined,
});

type LinkedCardTrashApp = FrontmatterMetadataApp & {
	metadataCache: FrontmatterMetadataApp['metadataCache'] & {
		getFirstLinkpathDest(path: string, sourcePath: string): FrontmatterFileLike | null;
	};
	fileManager: FrontmatterMutationApp['fileManager'] & {
		trashFile(file: FrontmatterFileLike): Promise<void>;
	};
	vault: {
		cachedRead(file: FrontmatterFileLike): Promise<string>;
	};
};

const FRONTMATTER_BLOCK_PATTERN = /^---\n[\s\S]*?\n---/;

const getMarkdownBody = (markdown: string): string => {
	const normalized = markdown.replace(/\r\n/g, '\n');
	const frontmatterBlock = normalized.match(FRONTMATTER_BLOCK_PATTERN);
	return (frontmatterBlock ? normalized.slice(frontmatterBlock[0].length) : normalized).trim();
};

export const clearLinkedCardEventBacklink = async (
	app: BacklinkApp,
	sourcePath: string,
	frontmatter: Frontmatter,
): Promise<void> => {
	const cardFile = resolveLinkedCardFileFromFrontmatter(app, sourcePath, frontmatter);
	if (!cardFile) return;
	await removeFrontmatterKey(app, cardFile, TIMELINK_EVENT_KEY);
};

export const syncLinkedCardEventBacklink = async ({
	app,
	eventFile,
	sourcePath,
	eventTitle,
	frontmatter,
	rollbackSnapshot,
}: SyncLinkedCardEventBacklinkParams): Promise<void> => {
	const cardFile = resolveLinkedCardFileFromFrontmatter(app, sourcePath, frontmatter);
	if (!cardFile) return;
	const eventLink = app.fileManager.generateMarkdownLink(eventFile, cardFile.path, '', eventTitle);
	if (!rollbackSnapshot) {
		await setFrontmatterValue(app, cardFile, TIMELINK_EVENT_KEY, eventLink);
		return;
	}
	rollbackSnapshot.file = cardFile;
	await app.fileManager.processFrontMatter(cardFile, (cardFrontmatter) => {
		rollbackSnapshot.captured = true;
		rollbackSnapshot.present = Object.prototype.hasOwnProperty.call(
			cardFrontmatter,
			TIMELINK_EVENT_KEY,
		);
		rollbackSnapshot.value = cardFrontmatter[TIMELINK_EVENT_KEY];
		rollbackSnapshot.expectedValue = eventLink;
		cardFrontmatter[TIMELINK_EVENT_KEY] = eventLink;
	});
};

export const restoreLinkedCardEventBacklink = async (
	app: FrontmatterMutationApp,
	snapshot: LinkedCardEventBacklinkSnapshot,
): Promise<void> => {
	if (!snapshot.file || !snapshot.captured) return;
	let fullyRestored = true;
	await app.fileManager.processFrontMatter(snapshot.file, (frontmatter) => {
		if (!Object.is(frontmatter[TIMELINK_EVENT_KEY], snapshot.expectedValue)) {
			fullyRestored = false;
			return;
		}
		if (snapshot.present) {
			frontmatter[TIMELINK_EVENT_KEY] = snapshot.value;
		} else {
			delete frontmatter[TIMELINK_EVENT_KEY];
		}
	});
	if (!fullyRestored) {
		throw new Error('Linked card frontmatter changed while the event was rolling back.');
	}
};

export const trashLinkedCardNoteIfBodyEmpty = async (
	app: LinkedCardTrashApp,
	sourcePath: string,
	frontmatter: Frontmatter,
): Promise<boolean> => {
	const cardFile = resolveLinkedCardFileFromFrontmatter(app, sourcePath, frontmatter);
	if (!cardFile) return false;
	const markdown = await app.vault.cachedRead(cardFile);
	if (getMarkdownBody(markdown)) {
		await removeFrontmatterKey(app, cardFile, TIMELINK_EVENT_KEY);
		return false;
	}
	await app.fileManager.trashFile(cardFile);
	return true;
};
