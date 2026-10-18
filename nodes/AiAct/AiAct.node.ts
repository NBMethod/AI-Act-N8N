import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
} from 'n8n-workflow';

import { checkFields, evidenceFields, resources, systemFields } from './AiAct.description';

const CREDENTIALS = 'aiActApi';

interface CheckResponse {
	decision: 'allow' | 'warn' | 'review' | 'block';
	risk_level: string;
	controls_missing: string[];
	would_block_in_strict: string[];
	obligations: Array<{ id: string; article: string }>;
	evidence_id: string | null;
}

export class AiAct implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'VerifactAI',
		name: 'aiAct',
		icon: { light: 'file:aiact.svg', dark: 'file:aiact.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Check AI workflows against the EU AI Act and record auditable evidence',
		defaults: { name: 'VerifactAI' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: CREDENTIALS, required: true }],
		properties: [...resources, ...checkFields, ...systemFields, ...evidenceFields],
	};

	methods = {
		loadOptions: {
			// Populating these from the API keeps the node in step with the rule pack:
			// a new control ships with a pack version, not with a node release.
			async getSystems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await request(this, 'GET', '/v1/systems')) as {
					systems: Array<{ id: string; name: string }>;
				};
				return response.systems.map((system) => ({ name: system.name, value: system.id }));
			},

			async getControls(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const packs = (await request(this, 'GET', '/v1/packs')) as { latest: string };
				const schema = (await request(
					this,
					'GET',
					`/v1/packs/${encodeURIComponent(packs.latest)}/schema`,
				)) as { controls: Record<string, { label: string; layer: string }> };

				return Object.entries(schema.controls).map(([id, control]) => ({
					name: `${control.label} (${control.layer})`,
					value: id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[];

				if (resource === 'check') {
					result = await runCheck(this, i);
				} else if (resource === 'system') {
					result = await handleSystem(this, i, operation);
				} else if (resource === 'evidence') {
					result = await handleEvidence(this, i, operation);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				const entries = Array.isArray(result) ? result : [result];
				output.push(
					...entries.map((json) => ({ json, pairedItem: { item: i } })),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Wrapping keeps the original message while giving n8n a typed error,
				// so the user sees an actionable message instead of a raw stack trace.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [output];
	}
}

async function runCheck(context: IExecuteFunctions, index: number): Promise<IDataObject> {
	const systemId = context.getNodeParameter('systemId', index) as string;
	const failOnBlock = context.getNodeParameter('failOnBlock', index, false) as boolean;
	const options = context.getNodeParameter('options', index, {}) as IDataObject;

	const body: IDataObject = { system_id: systemId };
	if (options.model) body.model = options.model;
	if (options.purpose) body.purpose = options.purpose;
	if (options.dryRun === true) body.dry_run = true;
	if (options.recordEvidence === false) body.record_evidence = false;

	const response = (await request(context, 'POST', '/v1/check', body)) as unknown as CheckResponse;

	// A blocked call is a legitimate answer, not a transport failure. Raising it
	// as an error is opt-in so that a workflow can branch on the decision
	// instead of stopping, which is what most teams want at first.
	if (failOnBlock && response.decision === 'block') {
		const missing = response.controls_missing.join(', ') || 'none reported';
		throw new NodeOperationError(
			context.getNode(),
			`Compliance check blocked this call. Missing controls: ${missing}`,
			{
				itemIndex: index,
				description:
					'Implement the missing controls, or set Strict Mode to dry run on this system while you close the gaps.',
			},
		);
	}

	return response as unknown as IDataObject;
}

async function handleSystem(
	context: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const body: IDataObject = {
			name: context.getNodeParameter('name', index) as string,
			facts: parseJsonParameter(context, index, 'facts'),
			implemented_controls: context.getNodeParameter('implementedControls', index, []) as string[],
			strict_mode: context.getNodeParameter('strictMode', index, 'off') as string,
		};
		// Absent on workflows saved before 0.2.0: treated as "no attestation".
		const rawAttestations = context.getNodeParameter('controlAttestations', index, '{}') as
			| string
			| IDataObject
			| undefined;
		const attestations =
			rawAttestations === undefined || rawAttestations === '' || rawAttestations === '{}'
				? {}
				: typeof rawAttestations === 'string'
					? parseJson(context, rawAttestations, index)
					: rawAttestations;
		if (Object.keys(attestations).length > 0) body.control_attestations = attestations;
		return (await request(context, 'POST', '/v1/systems', body)) as IDataObject;
	}

	if (operation === 'get') {
		const systemId = context.getNodeParameter('systemId', index) as string;
		return (await request(context, 'GET', `/v1/systems/${systemId}`)) as IDataObject;
	}

	if (operation === 'getAll') {
		const response = (await request(context, 'GET', '/v1/systems')) as {
			systems: IDataObject[];
		};
		return response.systems;
	}

	if (operation === 'update') {
		const systemId = context.getNodeParameter('systemId', index) as string;
		const fields = context.getNodeParameter('updateFields', index, {}) as IDataObject;
		const body: IDataObject = {};

		if (fields.name !== undefined) body.name = fields.name;
		if (fields.facts !== undefined) body.facts = parseJson(context, String(fields.facts), index);
		if (fields.implementedControls !== undefined) {
			body.implemented_controls = fields.implementedControls;
		}
		if (fields.controlAttestations !== undefined) {
			body.control_attestations = parseJson(context, String(fields.controlAttestations), index);
		}
		if (fields.packRef !== undefined && String(fields.packRef).trim() !== '') {
			body.pack_ref = String(fields.packRef).trim();
		}
		if (fields.strictMode !== undefined) body.strict_mode = fields.strictMode;

		return (await request(context, 'PATCH', `/v1/systems/${systemId}`, body)) as IDataObject;
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, {
		itemIndex: index,
	});
}

async function handleEvidence(
	context: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<IDataObject> {
	if (operation === 'getAll') {
		const systemId = context.getNodeParameter('systemId', index) as string;
		const limit = context.getNodeParameter('limit', index, 50) as number;
		return (await request(
			context,
			'GET',
			`/v1/systems/${systemId}/evidence?limit=${limit}`,
		)) as IDataObject;
	}

	if (operation === 'get') {
		const evidenceId = context.getNodeParameter('evidenceId', index) as string;
		return (await request(context, 'GET', `/v1/evidence/${evidenceId}`)) as IDataObject;
	}

	throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, {
		itemIndex: index,
	});
}

async function request(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await context.getCredentials(CREDENTIALS);
	const baseUrl = String(credentials.baseUrl ?? 'https://api.verifactai.app').replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
		headers: { 'Content-Type': 'application/json' },
	};
	if (body !== undefined) options.body = body;

	try {
		return (await context.helpers.httpRequestWithAuthentication.call(
			context,
			CREDENTIALS,
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as never);
	}
}

function parseJsonParameter(
	context: IExecuteFunctions,
	index: number,
	parameter: string,
): IDataObject {
	const raw = context.getNodeParameter(parameter, index) as string | IDataObject;
	if (typeof raw !== 'string') return raw;
	return parseJson(context, raw, index);
}

function parseJson(context: IExecuteFunctions, raw: string, index: number): IDataObject {
	try {
		return JSON.parse(raw) as IDataObject;
	} catch {
		throw new NodeOperationError(context.getNode(), 'The declaration is not valid JSON', {
			itemIndex: index,
		});
	}
}
