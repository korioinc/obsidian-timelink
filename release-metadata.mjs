import { readFileSync, writeFileSync } from 'node:fs';

const semverPattern =
	/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const mode = process.argv[2] ?? 'check';

if (mode !== 'check' && mode !== 'sync') {
	throw new Error(`Unsupported release metadata mode: ${mode}`);
}

const manifest = readJson('manifest.json');
const versions = readJson('versions.json');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const failures = [];

if (!semverPattern.test(manifest.version)) {
	failures.push(`manifest.json version is not valid SemVer: ${String(manifest.version)}`);
}
if (!semverPattern.test(manifest.minAppVersion)) {
	failures.push(
		`manifest.json minAppVersion is not valid SemVer: ${String(manifest.minAppVersion)}`,
	);
}
if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
	failures.push('versions.json must contain a version-to-minAppVersion object.');
}
if (packageJson.private !== true) {
	failures.push('package.json must be private.');
}
if (packageJson.version !== '0.0.0') {
	failures.push('package.json version must remain fixed at 0.0.0.');
}
if (packageLock.version !== '0.0.0' || packageLock.packages?.['']?.version !== '0.0.0') {
	failures.push('package-lock.json version must remain fixed at 0.0.0.');
}

const { version, minAppVersion } = manifest;
const hasCompatibilityEntry =
	versions &&
	typeof versions === 'object' &&
	!Array.isArray(versions) &&
	Object.prototype.hasOwnProperty.call(versions, version);

if (hasCompatibilityEntry && versions[version] !== minAppVersion) {
	failures.push(
		`versions.json already maps ${version} to ${String(versions[version])}; refusing to rewrite release history.`,
	);
}
if (mode === 'check' && !hasCompatibilityEntry) {
	failures.push(`versions.json must map ${version} to ${minAppVersion}.`);
}

if (failures.length > 0) {
	throw new Error(`Invalid release metadata:\n- ${failures.join('\n- ')}`);
}

if (mode === 'sync' && !hasCompatibilityEntry) {
	versions[version] = minAppVersion;
	writeFileSync('versions.json', `${JSON.stringify(versions, null, '\t')}\n`);
}

process.stdout.write(`${version}\n`);
