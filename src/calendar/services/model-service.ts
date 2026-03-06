import { buildEventFilename, toEventFromFrontmatter } from '../../shared/event/note-calendar-utils';
import type { CalendarEvent, EditableEventResponse, EventLocation } from '../../shared/event/types';
import {
	clearLinkedCardEventBacklink,
	syncLinkedCardEventBacklink,
} from './event-card-backlink-service';
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

	constructor(plugin: CalendarPluginContext, directory: string) {
		this.plugin = plugin;
		this.directory = normalizePath(directory);
	}

	getDirectory(): string {
		return this.directory;
	}

	getEventsInFile(file: TFile): EditableEventResponse[] {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) {
			return [];
		}

		const event = toEventFromFrontmatter(frontmatter as Partial<CalendarEvent>, file.basename);
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

	private resolveEventFileOrThrow(location: EventLocation): TFile {
		const { file, lineNumber } = location;
		if (lineNumber !== undefined) {
			throw new Error('Note calendar cannot handle inline events.');
		}
		const target = this.plugin.app.vault.getAbstractFileByPath(file.path);
		if (!target || !(target instanceof TFile)) {
			throw new Error(`File ${file.path} not found.`);
		}
		return target;
	}

	async deleteEvent(_location: EventLocation): Promise<void> {
		const target = this.resolveEventFileOrThrow(_location);
		const cachedFrontmatter = this.plugin.app.metadataCache.getFileCache(target)?.frontmatter;
		await clearLinkedCardEventBacklink(
			this.plugin.app,
			target.path,
			cachedFrontmatter as Record<string, unknown> | null | undefined,
		);

		await this.plugin.app.fileManager.trashFile(target);
	}

	async modifyEvent(
		_location: EventLocation,
		_newEvent: CalendarEvent,
		_updateCacheWithLocation: (loc: EventLocation) => void,
	): Promise<void> {
		const target = this.resolveEventFileOrThrow(_location);
		const sourcePath = target.path;
		const cachedFrontmatter = this.plugin.app.metadataCache.getFileCache(target)?.frontmatter;
		const existingCreator =
			typeof cachedFrontmatter?.creator === 'string' ? cachedFrontmatter.creator : undefined;

		const parentPath = target.parent?.path ?? this.directory;
		const newPath = `${parentPath}/${buildEventFilename(_newEvent)}`;
		const newLocation: EventLocation = {
			file: { path: newPath },
			lineNumber: undefined,
		};
		_updateCacheWithLocation(newLocation);
		if (target.path !== newPath) {
			await this.plugin.app.vault.rename(target, newPath);
		}
		const eventFrontmatter = buildEventFrontmatter({
			..._newEvent,
			creator: (existingCreator as CalendarEvent['creator']) ?? _newEvent.creator,
		});
		await this.plugin.app.fileManager.processFrontMatter(
			target,
			(frontmatter: Record<string, unknown>) => {
				Object.entries(eventFrontmatter).forEach(([key, value]) => {
					if (value === undefined) {
						delete frontmatter[key];
					} else {
						frontmatter[key] = value;
					}
				});
			},
		);
		await syncLinkedCardEventBacklink({
			app: this.plugin.app,
			eventFile: target,
			sourcePath,
			eventTitle: _newEvent.title,
			frontmatter: cachedFrontmatter as Record<string, unknown> | null | undefined,
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
