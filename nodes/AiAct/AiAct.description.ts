import type { INodeProperties } from 'n8n-workflow';

export const resources: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Compliance Check', value: 'check' },
			{ name: 'Evidence', value: 'evidence' },
			{ name: 'System', value: 'system' },
		],
		default: 'check',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['check'] } },
		options: [
			{
				name: 'Run Check',
				value: 'run',
				description: 'Evaluate a declared system and record an evidence record',
				action: 'Run a compliance check',
			},
		],
		default: 'run',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['system'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Declare a system' },
			{ name: 'Get', value: 'get', action: 'Get a system' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many systems' },
			{ name: 'Update', value: 'update', action: 'Update a system' },
		],
		default: 'create',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['evidence'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the evidence chain of a system, with its integrity check',
				action: 'Get many evidence records',
			},
			{ name: 'Get', value: 'get', action: 'Get an evidence record' },
		],
		default: 'getAll',
	},
];

const systemSelector: INodeProperties = {
	displayName: 'System Name or ID',
	name: 'systemId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getSystems' },
	default: '',
	required: true,
	description:
		'The declared system to evaluate. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

export const checkFields: INodeProperties[] = [
	{ ...systemSelector, displayOptions: { show: { resource: ['check'] } } },
	{
		displayName: 'Fail on Block',
		name: 'failOnBlock',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['check'] } },
		description:
			'Whether to stop the workflow when the decision is "block". Leave off to branch on the decision field yourself.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: ['check'] } },
		options: [
			{
				displayName: 'Dry Run',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description:
					'Whether to preview strict mode without enforcing it. The response lists what would be blocked.',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				description: 'Model identifier recorded in the evidence, for example gpt-5',
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'string',
				default: '',
				description: 'Use case recorded in the evidence, for example customer_support',
			},
			{
				displayName: 'Record Evidence',
				name: 'recordEvidence',
				type: 'boolean',
				default: true,
				description: 'Whether to append an evidence record. Turn off for previews only.',
			},
		],
	},
];

export const systemFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['system'], operation: ['create'] } },
		description: 'Label shown in the compliance dashboard, for example Support Chatbot',
	},
	{
		displayName: 'Declaration',
		name: 'facts',
		type: 'json',
		default: '{\n  "role": "provider",\n  "eu_nexus": true,\n  "interacts_with_humans": true\n}',
		required: true,
		displayOptions: { show: { resource: ['system'], operation: ['create'] } },
		description:
			'What the system is and who operates it. Call GET /v1/packs/:ref/schema for the full list of accepted facts.',
	},
	{
		displayName: 'Implemented Control Names or IDs',
		name: 'implementedControls',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getControls' },
		default: [],
		displayOptions: { show: { resource: ['system'], operation: ['create'] } },
		description:
			'Controls already in place. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Strict Mode',
		name: 'strictMode',
		type: 'options',
		default: 'off',
		displayOptions: { show: { resource: ['system'], operation: ['create'] } },
		options: [
			{ name: 'Off', value: 'off', description: 'Missing controls warn, nothing is blocked' },
			{ name: 'Dry Run', value: 'dry_run', description: 'Report what strict mode would block' },
			{ name: 'On', value: 'on', description: 'Missing runtime controls block the call' },
		],
		description: 'Start on dry run. Move to on once the reported gaps are closed.',
	},
	{
		...systemSelector,
		displayOptions: { show: { resource: ['system'], operation: ['get', 'update'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['system'], operation: ['update'] } },
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Declaration',
				name: 'facts',
				type: 'json',
				default: '{}',
			},
			{
				displayName: 'Implemented Control Names or IDs',
				name: 'implementedControls',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getControls' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Strict Mode',
				name: 'strictMode',
				type: 'options',
				default: 'off',
				options: [
					{ name: 'Off', value: 'off' },
					{ name: 'Dry Run', value: 'dry_run' },
					{ name: 'On', value: 'on' },
				],
			},
		],
	},
];

export const evidenceFields: INodeProperties[] = [
	{
		...systemSelector,
		displayOptions: { show: { resource: ['evidence'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['evidence'], operation: ['getAll'] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Evidence ID',
		name: 'evidenceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['evidence'], operation: ['get'] } },
	},
];
