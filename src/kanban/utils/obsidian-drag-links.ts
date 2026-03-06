import { extractWikiLinkSubpath } from '../../shared/utils/wiki-link';
import type { App, TFile } from 'obsidian';

export type ObsidianDraggable =
	| { type: 'file'; file: TFile }
	| { type: 'files'; files: TFile[] }
	| { type: 'link'; linktext: string; file?: TFile };

export function getObsidianDraggable(app: App): ObsidianDraggable | null {
	const dragManager = (app as App & { dragManager?: { draggable?: unknown } }).dragManager;
	if (!dragManager) return null;
	return (dragManager.draggable as ObsidianDraggable | undefined) ?? null;
}

export function draggableToLinks(
	app: App,
	sourcePath: string,
	draggable: ObsidianDraggable | null,
): string[] {
	if (!draggable) return [];
	if (draggable.type === 'file') {
		return [
			app.fileManager.generateMarkdownLink(draggable.file, sourcePath, '', draggable.file.basename),
		];
	}
	if (draggable.type === 'files') {
		return draggable.files.map((file) =>
			app.fileManager.generateMarkdownLink(file, sourcePath, '', file.basename),
		);
	}
	if (draggable.type === 'link') {
		if (draggable.file) {
			const subpath = extractWikiLinkSubpath(draggable.linktext);
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
	return [];
}
