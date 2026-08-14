import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AiActApi implements ICredentialType {
	name = 'aiActApi';

	displayName = 'AI Act Compliance API';

	documentationUrl = 'https://github.com/NBMethod/AI-Act-N8N#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create one in the AI Act Compliance dashboard, under Settings then API keys',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://aiact-api.0211-mbei.workers.dev',
			description: 'Change this only if you run a self-hosted or regional instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Lets the user confirm the key works before building a workflow around it.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/packs',
		},
	};
}
