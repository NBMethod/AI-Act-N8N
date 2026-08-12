const { src, dest } = require('gulp');

/** Icons and codex files are static assets: tsc ignores them, so they are copied to dist. */
function buildIcons() {
	return src('nodes/**/*.{png,svg,json}').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
