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

	documentationUrl = 'https://github.com/Analista-Moderno/n8n-nodes-blocos#credenciais';

	properties: INodeProperties[] = [
		{
			displayName: 'Chave de API',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'ex.: ak_...',
			description:
				'Chave criada na Blocos em Configurações › Desenvolvedores › Chaves de API. Ela age com o cargo de quem a criou.',
		},
		{
			displayName: 'URL base',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://app.blocosmarketing.com',
			description: 'Endereço da plataforma Blocos. Mude só para apontar para um ambiente de teste.',
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
