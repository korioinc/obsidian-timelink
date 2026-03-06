import {
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { resolveLinkedCardFileFromFrontmatter } from './linked-card-service';
import type { App, TFile } from 'obsidian';

type Frontmatter = Record<string, unknown> | null | undefined;

type SyncLinkedCardEventBacklinkParams = {
	app: App;
	eventFile: TFile;
	sourcePath: string;
	eventTitle: string;
	frontmatter: Frontmatter;
};

export const clearLinkedCardEventBacklink = async (
	app: App,
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
