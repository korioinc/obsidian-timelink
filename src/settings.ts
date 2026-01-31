import TimeLinkPlugin from './main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export interface TimeLinkSettings {
	enableKanban: boolean;
	calendarFolderPath: string;
}

export const DEFAULT_SETTINGS: TimeLinkSettings = {
	enableKanban: true,
	calendarFolderPath: 'TimeLink-Calendar',
};

export class TimeLinkSettingTab extends PluginSettingTab {
	plugin: TimeLinkPlugin;

	constructor(app: App, plugin: TimeLinkPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable kanban')
			.setDesc('Enable kanban board features')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableKanban).onChange(async (value) => {
					this.plugin.settings.enableKanban = value;
					await this.plugin.saveSettings();
					await this.plugin.syncKanbanState();
				}),
			);

		new Setting(containerEl)
			.setName('Calendar folder')
			.setDesc('Folder path to store calendar event notes')
			.addText((text) =>
				text.setValue(this.plugin.settings.calendarFolderPath).onChange(async (value) => {
					this.plugin.settings.calendarFolderPath = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
