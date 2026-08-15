import parser from '@typescript-eslint/parser';
import communityNodes from '@n8n/eslint-plugin-community-nodes';

/**
 * Mirrors the rules run by `npx @n8n/scan-community-package` during n8n
 * verification. Keeping them here means a failing check surfaces on your
 * machine and in CI, not after a package has already been published — npm
 * versions are permanent and cannot be replaced.
 */
const allRules = Object.fromEntries(
	Object.keys(communityNodes.rules ?? {}).map((rule) => [
		`@n8n/community-nodes/${rule}`,
		'error',
	]),
);

export default [
	{ ignores: ['dist/**', 'node_modules/**'] },
	{
		files: ['nodes/**/*.ts', 'credentials/**/*.ts'],
		languageOptions: {
			parser,
			parserOptions: { project: './tsconfig.eslint.json' },
		},
		plugins: { '@n8n/community-nodes': communityNodes },
		rules: allRules,
	},
];
