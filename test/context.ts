import type { IDataObject } from 'n8n-workflow';

/**
 * Minimal stand-in for n8n's execution context.
 *
 * The node must be testable without booting n8n, otherwise every change means a
 * manual click-through and regressions ship silently.
 */
export function createContext(options: {
	parameters: IDataObject;
	response?: unknown;
	responder?: (options: { method: string; url: string; body?: IDataObject }) => unknown;
	items?: IDataObject[];
	continueOnFail?: boolean;
	credentials?: IDataObject;
}) {
	const calls: Array<{ method: string; url: string; body?: IDataObject }> = [];

	const context = {
		calls,
		getInputData: () => (options.items ?? [{}]).map((json) => ({ json })),
		getNode: () => ({ name: 'AI Act Compliance', type: 'n8n-nodes-aiact.aiAct' }),
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async () =>
			options.credentials ?? { apiKey: 'ak_test_key', baseUrl: 'https://api.aiact.dev' },
		getNodeParameter: (name: string, _index: number, fallback?: unknown) => {
			const value = options.parameters[name];
			return value === undefined ? fallback : value;
		},
		helpers: {
			httpRequestWithAuthentication: {
				async call(_self: unknown, _credential: string, request: IDataObject) {
					const entry = {
						method: String(request.method),
						url: String(request.url),
						body: request.body as IDataObject | undefined,
					};
					calls.push(entry);
					if (options.responder) return options.responder(entry);
					return options.response;
				},
			},
		},
	};

	return context as unknown as never;
}
