import { extractWikiLinkSubpath } from '../../shared/utils/wiki-link';

type DraggableFile = {
	path: string;
	basename: string;
};
type DraggableApp = {
	dragManager?: { draggable?: unknown };
	fileManager: {
		generateMarkdownLink(
			file: DraggableFile,
			sourcePath: string,
			subpath: string,
			alias: string,
		): string;
	};
};

export type ObsidianDraggable =
	| { type: 'file'; file: DraggableFile }
	| { type: 'files'; files: DraggableFile[] }
	| { type: 'link'; linktext: string; file?: DraggableFile };

export function getObsidianDraggable(app: DraggableApp): ObsidianDraggable | null {
	const dragManager = app.dragManager;
	if (!dragManager) return null;
	return (dragManager.draggable as ObsidianDraggable | undefined) ?? null;
}

export function draggableToLinks(
	app: DraggableApp,
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
