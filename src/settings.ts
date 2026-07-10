import TimeLinkPlugin from './main';
import { syncCurrentSettingInput } from './settings-input-sync';
import { DEFAULT_SETTINGS } from './settings-model';
import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

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
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.enableKanban).onChange(async (value) => {
					toggle.setDisabled(true);
					try {
						await this.plugin.updateKanbanEnabled(value);
					} catch (error) {
						console.error('Failed to update kanban setting', error);
						toggle.setValue(this.plugin.settings.enableKanban);
						new Notice('Failed to update kanban setting.');
					} finally {
						toggle.setDisabled(false);
					}
				});
			});

		new Setting(containerEl)
			.setName('Calendar folder')
			.setDesc('Folder path to store calendar event notes')
			.addText((text) => {
				let pendingUpdates = 0;
				const syncPersistedValueWhenIdle = () => {
					if (pendingUpdates > 0) return;
					syncCurrentSettingInput(text, text.getValue(), this.plugin.settings.calendarFolderPath);
				};
				text.inputEl.addEventListener('blur', syncPersistedValueWhenIdle);
				text
					.setPlaceholder(DEFAULT_SETTINGS.calendarFolderPath)
					.setValue(this.plugin.settings.calendarFolderPath)
					.onChange(async (value) => {
						pendingUpdates += 1;
						try {
							await this.plugin.updateCalendarFolderPath(value);
						} catch (error) {
							console.error('Failed to update calendar folder', error);
							syncCurrentSettingInput(text, value, this.plugin.settings.calendarFolderPath);
							new Notice('Failed to update calendar folder.');
						} finally {
							pendingUpdates -= 1;
							if (text.inputEl.ownerDocument.activeElement !== text.inputEl) {
								syncPersistedValueWhenIdle();
							}
						}
					});
			});
	}
}
