import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = [
	'-i',
	path.join(__dirname, 'src', 'tailwind.css'),
	'-o',
	path.join(__dirname, 'styles.css'),
];

const mode = process.argv[2];

if (mode === 'production') {
	args.push('--minify');
}

if (mode === 'watch') {
	args.push('--watch');
}

execFileSync('npx', ['tailwindcss', ...args], {
	stdio: 'inherit',
	shell: process.platform === 'win32',
});
