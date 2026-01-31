import type TimeLinkPlugin from '../main';
import type { FullNoteCalendar } from './calendar';
import { CALENDAR_VIEW_TYPE } from './constants';
import { mountCalendarUI, unmountCalendarUI } from './ui';
import { ItemView, WorkspaceLeaf } from 'obsidian';

export class TimeLinkCalendarView extends ItemView {
	private plugin: TimeLinkPlugin;
	private calendar: FullNoteCalendar | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TimeLinkPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return CALENDAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar-glyph';
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (!container) {
			return;
		}
		container.empty();
		const calendar = this.plugin.calendar?.getCalendar();
		if (!calendar) {
			container.createEl('div', { text: 'Calendar not ready.' });
			return;
		}
		this.calendar = calendar;
		mountCalendarUI(container, this.plugin.app, calendar, (path) => {
			void this.plugin.app.workspace.openLinkText(path, '', true);
		});
	}

	onResize(): void {
		void this.calendar;
	}

	async onClose(): Promise<void> {
		await super.onClose();
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (container) {
			unmountCalendarUI(container);
		}
		this.calendar = null;
	}
}
