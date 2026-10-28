import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BlocosApi implements ICredentialType {
	name = 'blocosApi';

	displayName = 'Blocos Marketing API';

	icon: Icon = { light: 'file:../icons/blocos.svg', dark: 'file:../icons/blocos.dark.svg' };

	documentationUrl = 'https://github.com/Analista-Moderno/n8n-nodes-blocos#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'e.g. ak_...',
			description:
				'Key created in Blocos under Settings > Developers > API keys. It acts with the role of the person who created it.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://app.blocosmarketing.com',
			description: 'Address of the Blocos platform. Change it only to point at a test environment.',
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
