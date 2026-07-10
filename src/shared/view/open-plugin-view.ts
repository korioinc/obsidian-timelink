import { Notice, type App, type WorkspaceLeaf } from 'obsidian';

type ViewLocation = 'tab' | 'right';

const getLeafForLocation = (app: App, location: ViewLocation): WorkspaceLeaf | null => {
	if (location === 'right') {
		return app.workspace.getRightLeaf(false) ?? app.workspace.getLeaf('tab');
	}
	return app.workspace.getLeaf('tab') ?? app.workspace.getRightLeaf(false);
};

export const openOrRevealPluginView = async (
	app: App,
	viewType: string,
	location: ViewLocation,
	unavailableMessage: string,
): Promise<void> => {
	const existingLeaf = app.workspace.getLeavesOfType(viewType)[0];
	if (existingLeaf) {
		await app.workspace.revealLeaf(existingLeaf);
		return;
	}

	const leaf = getLeafForLocation(app, location);
	if (!leaf) {
		new Notice(unavailableMessage);
		return;
	}

	await leaf.setViewState({ type: viewType, active: true });
	await app.workspace.revealLeaf(leaf);
};
