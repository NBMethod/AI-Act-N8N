const { src, dest } = require('gulp');

/**
 * Icons and codex files are static assets that tsc ignores, so they are copied
 * into dist separately. Credentials need their icons too — a missing icon
 * fails n8n verification.
 */
function buildNodeIcons() {
	return src('nodes/**/*.{png,svg,json}').pipe(dest('dist/nodes'));
}

function buildCredentialIcons() {
	return src('credentials/**/*.{png,svg}').pipe(dest('dist/credentials'));
}

exports['build:icons'] = require('gulp').parallel(buildNodeIcons, buildCredentialIcons);
