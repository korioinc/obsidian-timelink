import type TimeLinkPlugin from '../main';
import type { CalendarEvent } from './types';
import { TFile, TFolder, normalizePath } from 'obsidian';

export type EventLocation = {
	file: { path: string };
	lineNumber: number | undefined;
};

export type EditableEventResponse = [CalendarEvent, EventLocation];

const basenameFromEvent = (event: CalendarEvent): string =>
	`${event.date ?? ''} ${event.title}`.trim();

const filenameForEvent = (event: CalendarEvent) => `${basenameFromEvent(event)}.md`;

const FRONTMATTER_SEPARATOR = '---';

const hasFrontmatter = (page: string): boolean =>
	page.indexOf(FRONTMATTER_SEPARATOR) === 0 && page.slice(3).indexOf(FRONTMATTER_SEPARATOR) !== -1;

const _extractPageContents = (page: string): string => {
	if (hasFrontmatter(page)) {
		return page.split(FRONTMATTER_SEPARATOR).slice(2).join(FRONTMATTER_SEPARATOR);
	}
	return page;
};

type PrintableAtom = Array<number | string> | number | string | boolean;

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

const TIMELINK_CARD_KEY = 'timelinkCard';
const TIMELINK_EVENT_KEY = 'timelinkEvent';

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

const getFirstWikiLinkPath = (value?: string): string | null => {
	if (!value) return null;
	const match = value.match(/\[\[([^\]]+)\]\]/);
	if (!match?.[1]) return null;
	const raw = match[1].trim();
	if (!raw) return null;
	const noAlias = raw.split('|')[0]?.trim() ?? '';
	if (!noAlias) return null;
	return noAlias.split('#')[0]?.trim() ?? null;
};

export class FullNoteCalendar {
	private plugin: TimeLinkPlugin;
	private directory: string;

	constructor(plugin: TimeLinkPlugin, directory: string) {
		this.plugin = plugin;
		this.directory = normalizePath(directory);
	}

	getDirectory(): string {
		return this.directory;
	}

	async getEventsInFile(file: TFile): Promise<EditableEventResponse[]> {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) {
			return [];
		}

		const raw = frontmatter as Partial<CalendarEvent>;
		if (!raw.title) {
			raw.title = file.basename;
		}
		if (raw.allDay === undefined) {
			raw.allDay = false;
		}
		return [[raw as CalendarEvent, { file, lineNumber: undefined }]];
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
				const results = await this.getEventsInFile(file);
				events.push(...results);
			}
		}
		return events;
	}

	async createEvent(_event: CalendarEvent, body?: string): Promise<EventLocation> {
		const event = _event;
		await this.ensureEventFolder();
		const path = `${this.directory}/${filenameForEvent(event)}`;
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

	async deleteEvent(_location: EventLocation): Promise<void> {
		const { file, lineNumber } = _location;
		if (lineNumber !== undefined) {
			throw new Error('Note calendar cannot handle inline events.');
		}
		const target = this.plugin.app.vault.getAbstractFileByPath(file.path);
		if (!target || !(target instanceof TFile)) {
			throw new Error(`File ${file.path} not found.`);
		}
		await this.plugin.app.fileManager.trashFile(target);
	}

	async modifyEvent(
		_location: EventLocation,
		_newEvent: CalendarEvent,
		_updateCacheWithLocation: (loc: EventLocation) => void,
	): Promise<void> {
		const { file, lineNumber } = _location;
		if (lineNumber !== undefined) {
			throw new Error('Note calendar cannot handle inline events.');
		}
		const target = this.plugin.app.vault.getAbstractFileByPath(file.path);
		if (!target || !(target instanceof TFile)) {
			throw new Error(`File ${file.path} not found.`);
		}
		const cachedFrontmatter = this.plugin.app.metadataCache.getFileCache(target)?.frontmatter;
		const existingCardLink =
			typeof cachedFrontmatter?.[TIMELINK_CARD_KEY] === 'string'
				? cachedFrontmatter[TIMELINK_CARD_KEY]
				: null;
		const existingCreator =
			typeof cachedFrontmatter?.creator === 'string' ? cachedFrontmatter.creator : undefined;
		const cardPath = getFirstWikiLinkPath(existingCardLink ?? undefined);
		const cardFile =
			cardPath !== null
				? this.plugin.app.metadataCache.getFirstLinkpathDest(cardPath, target.path)
				: null;

		const parentPath = target.parent?.path ?? this.directory;
		const newPath = `${parentPath}/${filenameForEvent(_newEvent)}`;
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

		if (cardFile && cardFile instanceof TFile) {
			const eventLink = this.plugin.app.fileManager.generateMarkdownLink(
				target,
				cardFile.path,
				'',
				_newEvent.title,
			);
			await this.plugin.app.fileManager.processFrontMatter(
				cardFile,
				(frontmatter: Record<string, unknown>) => {
					frontmatter[TIMELINK_EVENT_KEY] = eventLink;
				},
			);
		}
	}
}

export class TimeLinkCalendar {
	private calendar: FullNoteCalendar;

	constructor(plugin: TimeLinkPlugin, folderPath: string) {
		this.calendar = new FullNoteCalendar(plugin, folderPath);
	}

	getCalendar(): FullNoteCalendar {
		return this.calendar;
	}
}
