import type { App, Component } from 'obsidian';
import { MarkdownRenderer } from 'obsidian';
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

export function CardTitleRenderer({
	title,
	markdownContext,
}: CardTitleRendererProps): h.JSX.Element {
	const hostRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

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

		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			const anchor = target.closest('a');
			if (!anchor) return;
			const href = anchor.getAttribute('data-href') ?? anchor.getAttribute('href');
			if (!href) return;
			event.preventDefault();
			event.stopPropagation();
			void markdownContext.app.workspace.openLinkText(href, markdownContext.sourcePath, true);
		};

		host.addEventListener('click', handleClick);
		return () => {
			cancelled = true;
			host.removeEventListener('click', handleClick);
			host.innerHTML = '';
		};
	}, [title, markdownContext.app, markdownContext.component, markdownContext.sourcePath]);

	return <span ref={hostRef} className="block pr-6" />;
}
