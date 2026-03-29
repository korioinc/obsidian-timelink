import { getLeafFilePath } from '../services/leaf-service';
import { createCardTitleLinkClickGuard } from '../utils/card-title-link-click-guard';
import type { App, Component } from 'obsidian';
import { MarkdownRenderer, TFile } from 'obsidian';
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export type CardTitleMarkdownContext = {
	app: App;
	component: Component;
	sourcePath: string;
};

type CardTitleRendererProps = {
	title: string;
	markdownContext: CardTitleMarkdownContext;
};

async function openCardTitleLink(app: App, href: string, sourcePath: string): Promise<void> {
	const destination = app.metadataCache.getFirstLinkpathDest(href, sourcePath);
	if (destination instanceof TFile) {
		const existingLeaf = app.workspace
			.getLeavesOfType('markdown')
			.find((leaf) => getLeafFilePath(leaf) === destination.path);
		if (existingLeaf) {
			await Promise.resolve(app.workspace.revealLeaf(existingLeaf));
			return;
		}
	}

	await app.workspace.openLinkText(href, sourcePath, true);
}

export function CardTitleRenderer({
	title,
	markdownContext,
}: CardTitleRendererProps): h.JSX.Element {
	const hostRef = useRef<HTMLSpanElement>(null);
	const linkClickGuardRef = useRef(createCardTitleLinkClickGuard());

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const dragContainer = host.closest<HTMLElement>('li[data-card-id]');

		host.innerHTML = '';
		let cancelled = false;
		const displayTitle = title.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');

		void MarkdownRenderer.render(
			markdownContext.app,
			displayTitle,
			host,
			markdownContext.sourcePath,
			markdownContext.component,
		).then(() => {
			if (cancelled) return;
			host.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) => {
				anchor.setAttribute('draggable', 'false');
			});
		});

		const handleDragInteraction = () => {
			linkClickGuardRef.current.noteDragInteraction();
		};
		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			const anchor = target.closest('a');
			if (!anchor) return;
			if (linkClickGuardRef.current.shouldSuppressClick()) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			const href = anchor.getAttribute('data-href') ?? anchor.getAttribute('href');
			if (!href) return;
			event.preventDefault();
			event.stopPropagation();
			void openCardTitleLink(markdownContext.app, href, markdownContext.sourcePath);
		};

		dragContainer?.addEventListener('dragstart', handleDragInteraction);
		dragContainer?.addEventListener('dragend', handleDragInteraction);
		host.addEventListener('click', handleClick);
		return () => {
			cancelled = true;
			dragContainer?.removeEventListener('dragstart', handleDragInteraction);
			dragContainer?.removeEventListener('dragend', handleDragInteraction);
			host.removeEventListener('click', handleClick);
			host.innerHTML = '';
		};
	}, [title, markdownContext.app, markdownContext.component, markdownContext.sourcePath]);

	return <span ref={hostRef} className="block pr-6" />;
}
