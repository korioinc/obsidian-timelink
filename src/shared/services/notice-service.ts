import { Notice } from 'obsidian';

export const createNotice = () => {
	return (message: string) => {
		new Notice(message);
	};
};
