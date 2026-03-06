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
}: SyncLinkedCardEventBacklinkParams): Promise<void> => {
	const cardFile = resolveLinkedCardFileFromFrontmatter(app, sourcePath, frontmatter);
	if (!cardFile) return;
	const eventLink = app.fileManager.generateMarkdownLink(eventFile, cardFile.path, '', eventTitle);
	await setFrontmatterValue(app, cardFile, TIMELINK_EVENT_KEY, eventLink);
};
