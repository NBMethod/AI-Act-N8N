import { describe, expect, it } from 'vitest';
import { AiAct } from '../nodes/AiAct/AiAct.node';
import { createContext } from './context';

const allowResponse = {
	decision: 'allow',
	risk_level: 'transparency',
	controls_missing: [],
	would_block_in_strict: [],
	obligations: [{ id: 'ART_50_1_DISCLOSURE', article: 'Article 50(1)' }],
	evidence_id: 'evt_1',
};

const blockResponse = {
	...allowResponse,
	decision: 'block',
	controls_missing: ['disclose_ai_interaction'],
};

const node = new AiAct();

describe('node description', () => {
	it('declares one credential and no runtime dependency', () => {
		expect(node.description.credentials).toEqual([{ name: 'aiActApi', required: true }]);
		expect(node.description.version).toBe(1);
	});

	it('is usable as an AI agent tool', () => {
		expect(node.description.usableAsTool).toBe(true);
	});
});

describe('compliance check', () => {
	it('posts the system reference and returns the decision', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', options: { model: 'gpt-5' } },
			response: allowResponse,
		});

		const [items] = await node.execute.call(context);
		expect(items[0].json.decision).toBe('allow');

		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.method).toBe('POST');
		expect(call.url).toBe('https://api.aiact.dev/v1/check');
		expect(call.body).toEqual({ system_id: 'sys_1', model: 'gpt-5' });
	});

	it('never sends prompts or message content', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', options: {} },
			items: [{ chatInput: 'my customer bank details' }],
			response: allowResponse,
		});

		await node.execute.call(context);
		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(JSON.stringify(call.body)).not.toContain('bank details');
	});

	it('passes a blocked decision through by default, for the user to branch on', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', options: {} },
			response: blockResponse,
		});

		const [items] = await node.execute.call(context);
		expect(items[0].json.decision).toBe('block');
	});

	it('stops the workflow when Fail on Block is enabled', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', failOnBlock: true, options: {} },
			response: blockResponse,
		});

		await expect(node.execute.call(context)).rejects.toThrow(/disclose_ai_interaction/);
	});

	it('does not stop on a warning, even with Fail on Block', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', failOnBlock: true, options: {} },
			response: { ...allowResponse, decision: 'warn', controls_missing: ['ai_literacy_program'] },
		});

		const [items] = await node.execute.call(context);
		expect(items[0].json.decision).toBe('warn');
	});

	it('forwards dry run and evidence options', async () => {
		const context = createContext({
			parameters: {
				resource: 'check',
				operation: 'run',
				systemId: 'sys_1',
				options: { dryRun: true, recordEvidence: false, purpose: 'customer_support' },
			},
			response: allowResponse,
		});

		await node.execute.call(context);
		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.body).toEqual({
			system_id: 'sys_1',
			purpose: 'customer_support',
			dry_run: true,
			record_evidence: false,
		});
	});

	it('processes every input item and keeps pairing', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', options: {} },
			items: [{ a: 1 }, { b: 2 }, { c: 3 }],
			response: allowResponse,
		});

		const [items] = await node.execute.call(context);
		expect(items).toHaveLength(3);
		expect(items[2].pairedItem).toEqual({ item: 2 });
	});

	it('collects errors per item when Continue On Fail is set', async () => {
		const context = createContext({
			parameters: { resource: 'check', operation: 'run', systemId: 'sys_1', failOnBlock: true, options: {} },
			items: [{}, {}],
			continueOnFail: true,
			response: blockResponse,
		});

		const [items] = await node.execute.call(context);
		expect(items).toHaveLength(2);
		expect(items[0].json.error).toMatch(/blocked/);
	});
});

describe('systems', () => {
	it('creates a system from a JSON declaration', async () => {
		const context = createContext({
			parameters: {
				resource: 'system',
				operation: 'create',
				name: 'Support chatbot',
				facts: '{"role":"provider","eu_nexus":true}',
				implementedControls: ['disclose_ai_interaction'],
				strictMode: 'dry_run',
			},
			response: { id: 'sys_2' },
		});

		const [items] = await node.execute.call(context);
		expect(items[0].json.id).toBe('sys_2');

		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.body).toEqual({
			name: 'Support chatbot',
			facts: { role: 'provider', eu_nexus: true },
			implemented_controls: ['disclose_ai_interaction'],
			strict_mode: 'dry_run',
		});
	});

	it('reports invalid JSON as a node error, not a crash', async () => {
		const context = createContext({
			parameters: { resource: 'system', operation: 'create', name: 'Broken', facts: '{role: provider}' },
			response: {},
		});

		await expect(node.execute.call(context)).rejects.toThrow(/not valid JSON/);
	});

	it('flattens the system list into one item per system', async () => {
		const context = createContext({
			parameters: { resource: 'system', operation: 'getAll' },
			response: { systems: [{ id: 'sys_1' }, { id: 'sys_2' }] },
		});

		const [items] = await node.execute.call(context);
		expect(items.map((item) => item.json.id)).toEqual(['sys_1', 'sys_2']);
	});

	it('sends only the fields the user filled in on update', async () => {
		const context = createContext({
			parameters: {
				resource: 'system',
				operation: 'update',
				systemId: 'sys_1',
				updateFields: { strictMode: 'on' },
			},
			response: { id: 'sys_1' },
		});

		await node.execute.call(context);
		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.method).toBe('PATCH');
		expect(call.body).toEqual({ strict_mode: 'on' });
	});
});

describe('evidence', () => {
	it('requests the chain with the integrity check', async () => {
		const context = createContext({
			parameters: { resource: 'evidence', operation: 'getAll', systemId: 'sys_1', limit: 10 },
			response: { count: 3, integrity: { valid: true }, records: [] },
		});

		const [items] = await node.execute.call(context);
		expect(items[0].json.integrity).toEqual({ valid: true });

		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.url).toBe('https://api.aiact.dev/v1/systems/sys_1/evidence?limit=10');
	});
});

describe('dynamic options', () => {
	it('lists declared systems for the dropdown', async () => {
		const context = createContext({
			parameters: {},
			response: { systems: [{ id: 'sys_1', name: 'Support chatbot' }] },
		});

		const options = await node.methods.loadOptions.getSystems.call(context);
		expect(options).toEqual([{ name: 'Support chatbot', value: 'sys_1' }]);
	});

	it('loads controls from the pack, so a new control needs no node release', async () => {
		const context = createContext({
			parameters: {},
			responder: ({ url }) =>
				url.endsWith('/v1/packs')
					? { latest: 'eu-ai-act@2026.08.1' }
					: {
							controls: {
								disclose_ai_interaction: { label: 'AI interaction disclosure', layer: 'runtime' },
							},
						},
		});

		const options = await node.methods.loadOptions.getControls.call(context);
		expect(options).toEqual([
			{ name: 'AI interaction disclosure (runtime)', value: 'disclose_ai_interaction' },
		]);
	});

	it('honours a self-hosted base URL', async () => {
		const context = createContext({
			parameters: {},
			credentials: { apiKey: 'ak_test_key', baseUrl: 'https://compliance.acme.eu/' },
			response: { systems: [] },
		});

		await node.methods.loadOptions.getSystems.call(context);
		const call = (context as unknown as { calls: Array<Record<string, unknown>> }).calls[0];
		expect(call.url).toBe('https://compliance.acme.eu/v1/systems');
	});
});
