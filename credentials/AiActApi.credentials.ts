import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class AiActApi implements ICredentialType {
	name = 'aiActApi';

	displayName = 'VerifactAI API';

	// Both variants are required: a single-file icon renders poorly on one of
	// the two n8n themes.
	icon: Icon = { light: 'file:aiact.svg', dark: 'file:aiact.dark.svg' };

	documentationUrl = 'https://github.com/NBMethod/AI-Act-N8N#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create an account on <a href="https://verifactai.app" target="_blank">VerifactAI</a>. Your API key is emailed to you and shown only once.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.verifactai.app',
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
