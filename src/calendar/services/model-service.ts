import { buildEventFilename, toEventFromFrontmatter } from '../../shared/event/note-calendar-utils';
import type {
	CalendarEvent,
	DeleteEventOptions,
	EditableEventResponse,
	EventLocation,
} from '../../shared/event/types';
import { SerialTaskQueue } from '../../shared/utils/serial-task-queue';
import {
	clearLinkedCardEventBacklink,
	createLinkedCardEventBacklinkSnapshot,
	restoreLinkedCardEventBacklink,
	syncLinkedCardEventBacklink,
	trashLinkedCardNoteIfBodyEmpty,
} from './event-card-backlink-service';
import {
	applyEventFrontmatterWithSnapshot,
	createEventFrontmatterSnapshot,
	restoreEventFrontmatterSnapshot,
} from './event-frontmatter-transaction';
import { runEventModificationTransaction } from './event-modification-transaction';
import { TFile, TFolder, normalizePath, type App } from 'obsidian';

type PrintableAtom = Array<number | string> | number | string | boolean;
type CalendarPluginContext = { app: App };

const stringifyYamlAtom = (value: PrintableAtom): string => {
	if (Array.isArray(value)) {
		return `[${value.map(stringifyYamlAtom).join(',')}]`;
	}
	if (typeof value === 'string') {
		return JSON.stringify(value);
	}
	return `${value}`;
};

const stringifyYamlLine = (key: string | number | symbol, value: PrintableAtom): string =>
	`${String(key)}: ${stringifyYamlAtom(value)}`;

const newFrontmatter = (fields: Partial<CalendarEvent>): string =>
	`---\n${Object.entries(fields)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => stringifyYamlLine(key, value as PrintableAtom))
		.join('\n')}\n---\n`;

const buildEventFrontmatter = (event: CalendarEvent): Partial<CalendarEvent> => ({
	title: event.title,
	allDay: event.allDay,
	color: event.color,
	date: event.date,
	completed: event.completed,
	endDate: event.endDate,
	startTime: event.startTime,
	endTime: event.endTime,
	taskEvent: event.taskEvent,
	creator: event.creator,
});

export class FullNoteCalendar {
	private plugin: CalendarPluginContext;
	private directory: string;
	private readonly directoryChangeListeners = new Set<() => void>();
	private readonly modificationQueue = new SerialTaskQueue();
	private readonly activeModificationFilesByPath = new Map<string, TFile>();
	private readonly pendingModificationCounts = new Map<TFile, number>();

	constructor(plugin: CalendarPluginContext, directory: string) {
		this.plugin = plugin;
		this.directory = normalizePath(directory);
	}

	getDirectory(): string {
		return this.directory;
	}

	setDirectory(directory: string): void {
		const nextDirectory = normalizePath(directory);
		if (nextDirectory === this.directory) return;
		this.directory = nextDirectory;
		this.directoryChangeListeners.forEach((listener) => listener());
	}

	onDirectoryChange(listener: () => void): () => void {
		this.directoryChangeListeners.add(listener);
		return () => this.directoryChangeListeners.delete(listener);
	}

	getEventsInFile(file: TFile): EditableEventResponse[] {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) {
			return [];
		}

		const event = toEventFromFrontmatter(frontmatter, file.basename);
		return [[event, { file, lineNumber: undefined }]];
	}

	private async ensureEventFolder(): Promise<TFolder> {
		const { vault } = this.plugin.app;
		const existing = vault.getAbstractFileByPath(this.directory);
		if (existing) {
			if (!(existing instanceof TFolder)) {
				throw new Error(`${this.directory} is not a directory.`);
			}
			return existing;
		}

		await this.createFolderPath(this.directory);
		const created = vault.getAbstractFileByPath(this.directory);
		if (!created || !(created instanceof TFolder)) {
			throw new Error(`Cannot create folder ${this.directory}`);
		}
		return created;
	}

	private async createFolderPath(path: string): Promise<void> {
		const { vault } = this.plugin.app;
		const parts = normalizePath(path)
			.split('/')
			.filter((part) => part.length > 0);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = vault.getAbstractFileByPath(current);
			if (existing) {
				if (!(existing instanceof TFolder)) {
					throw new Error(`${current} is not a directory.`);
				}
				continue;
			}
			await vault.createFolder(current);
		}
	}

	async getEvents(): Promise<EditableEventResponse[]> {
		const eventFolder = await this.ensureEventFolder();
		const events: EditableEventResponse[] = [];
		for (const file of eventFolder.children) {
			if (file instanceof TFile) {
				const results = this.getEventsInFile(file);
				events.push(...results);
			}
		}
		return events;
	}

	async createEvent(_event: CalendarEvent, body?: string): Promise<EventLocation> {
		const event = _event;
		await this.ensureEventFolder();
		const path = `${this.directory}/${buildEventFilename(event)}`;
		const { vault } = this.plugin.app;
		if (vault.getAbstractFileByPath(path)) {
			throw new Error(`Event at ${path} already exists.`);
		}
		const frontmatter = newFrontmatter(buildEventFrontmatter(event));
		const trimmedBody = body?.trim();
		const contents = trimmedBody ? `${frontmatter}${trimmedBody}\n` : frontmatter;
		const file = await vault.create(path, contents);
		return { file, lineNumber: undefined };
	}

	private assertNoteEventLocation(location: EventLocation): void {
		if (location.lineNumber !== undefined) {
			throw new Error('Note calendar cannot handle inline events.');
		}
	}

	private resolveEventFileOrThrow(location: EventLocation): TFile {
		this.assertNoteEventLocation(location);
		const { file } = location;
		const target = this.plugin.app.vault.getAbstractFileByPath(file.path);
		if (!target || !(target instanceof TFile)) {
			throw new Error(`File ${file.path} not found.`);
		}
		return target;
	}

	private resolveActiveEventFileOrThrow(location: EventLocation): TFile {
		this.assertNoteEventLocation(location);
		return (
			this.activeModificationFilesByPath.get(location.file.path) ??
			this.resolveEventFileOrThrow(location)
		);
	}

	async deleteEvent(
		_location: EventLocation,
		options?: DeleteEventOptions,
	): Promise<EventLocation> {
		const target = this.resolveActiveEventFileOrThrow(_location);
		this.retainModificationTarget(target, _location.file.path);
		try {
			return await this.modificationQueue.run(() => this.deleteResolvedEvent(target, options));
		} finally {
			this.releaseModificationTarget(target);
		}
	}

	private async deleteResolvedEvent(
		target: TFile,
		options?: DeleteEventOptions,
	): Promise<EventLocation> {
		const deletedLocation: EventLocation = {
			file: { path: target.path },
			lineNumber: undefined,
		};
		const cachedFrontmatter = this.plugin.app.metadataCache.getFileCache(target)?.frontmatter;
		if (options?.deleteLinkedNote) {
			await trashLinkedCardNoteIfBodyEmpty(this.plugin.app, target.path, cachedFrontmatter);
		} else {
			await clearLinkedCardEventBacklink(this.plugin.app, target.path, cachedFrontmatter);
		}

		await this.plugin.app.fileManager.trashFile(target);
		return deletedLocation;
	}

	async modifyEvent(
		_location: EventLocation,
		_newEvent: CalendarEvent,
		_updateCacheWithLocation: (loc: EventLocation) => void,
	): Promise<void> {
		const target = this.resolveActiveEventFileOrThrow(_location);
		this.retainModificationTarget(target, _location.file.path);
		try {
			await this.modificationQueue.run(() =>
				this.modifyResolvedEvent(target, _newEvent, _updateCacheWithLocation),
			);
		} finally {
			this.releaseModificationTarget(target);
		}
	}

	private retainModificationTarget(target: TFile, requestedPath: string): void {
		this.pendingModificationCounts.set(
			target,
			(this.pendingModificationCounts.get(target) ?? 0) + 1,
		);
		this.activeModificationFilesByPath.set(requestedPath, target);
		this.activeModificationFilesByPath.set(target.path, target);
	}

	private releaseModificationTarget(target: TFile): void {
		const nextCount = (this.pendingModificationCounts.get(target) ?? 1) - 1;
		if (nextCount > 0) {
			this.pendingModificationCounts.set(target, nextCount);
			return;
		}
		this.pendingModificationCounts.delete(target);
		for (const [path, activeTarget] of this.activeModificationFilesByPath) {
			if (activeTarget === target) this.activeModificationFilesByPath.delete(path);
		}
	}

	private async modifyResolvedEvent(
		target: TFile,
		newEvent: CalendarEvent,
		updateCacheWithLocation: (loc: EventLocation) => void,
	): Promise<void> {
		const sourcePath = target.path;
		this.activeModificationFilesByPath.set(sourcePath, target);
		const cachedFrontmatter = this.plugin.app.metadataCache.getFileCache(target)?.frontmatter;
		const existingCreator =
			typeof cachedFrontmatter?.creator === 'string' ? cachedFrontmatter.creator : undefined;

		const parentPath = target.parent?.path ?? this.directory;
		const newPath = `${parentPath}/${buildEventFilename(newEvent)}`;
		const newLocation: EventLocation = {
			file: { path: newPath },
			lineNumber: undefined,
		};
		const eventFrontmatter = buildEventFrontmatter({
			...newEvent,
			creator: (existingCreator as CalendarEvent['creator']) ?? newEvent.creator,
		});
		const backlinkSnapshot = createLinkedCardEventBacklinkSnapshot();
		const eventFrontmatterSnapshot = createEventFrontmatterSnapshot();
		await runEventModificationTransaction({
			target,
			sourcePath,
			nextPath: newPath,
			rename: (path) => this.plugin.app.vault.rename(target, path),
			writeFrontmatter: () =>
				this.plugin.app.fileManager.processFrontMatter(
					target,
					(frontmatter: Record<string, unknown>) =>
						applyEventFrontmatterWithSnapshot(
							frontmatter,
							eventFrontmatter,
							eventFrontmatterSnapshot,
						),
				),
			syncBacklink: () =>
				syncLinkedCardEventBacklink({
					app: this.plugin.app,
					eventFile: target,
					sourcePath,
					eventTitle: newEvent.title,
					frontmatter: cachedFrontmatter,
					rollbackSnapshot: backlinkSnapshot,
				}),
			restoreBacklink: () => restoreLinkedCardEventBacklink(this.plugin.app, backlinkSnapshot),
			restoreEvent: async () => {
				let fullyRestored = true;
				await this.plugin.app.fileManager.processFrontMatter(
					target,
					(frontmatter: Record<string, unknown>) => {
						fullyRestored = restoreEventFrontmatterSnapshot(frontmatter, eventFrontmatterSnapshot);
					},
				);
				if (!fullyRestored) {
					throw new Error('Event frontmatter changed while the modification was rolling back.');
				}
			},
			onCommitted: () => {
				this.activeModificationFilesByPath.set(newPath, target);
				updateCacheWithLocation(newLocation);
			},
			onRollbackFailed: (currentPath) => {
				this.activeModificationFilesByPath.set(currentPath, target);
				updateCacheWithLocation({ file: { path: currentPath }, lineNumber: undefined });
			},
		});
	}
}

export class TimeLinkCalendar {
	private calendar: FullNoteCalendar;

	constructor(plugin: CalendarPluginContext, folderPath: string) {
		this.calendar = new FullNoteCalendar(plugin, folderPath);
	}

	getCalendar(): FullNoteCalendar {
		return this.calendar;
	}
}
