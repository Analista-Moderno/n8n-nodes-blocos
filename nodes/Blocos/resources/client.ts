import type { INodeProperties } from 'n8n-workflow';
import {
	apiRequest,
	clientSelect,
	COMMA_LIST_VALUE,
	contactFields,
	paginationFields,
	sortByName,
	SPLIT_DATA,
	toBody,
	toQuery,
} from '../shared/descriptions';

const show = { resource: ['client'] };

const CURRENCIES = [
	'ARS',
	'BOB',
	'BRL',
	'CLP',
	'COP',
	'EUR',
	'GBP',
	'MXN',
	'PEN',
	'PYG',
	'USD',
	'UYU',
];

const statusOptions = [
	{ name: 'Arquivado', value: 'archived' },
	{ name: 'Ativo', value: 'active' },
	{ name: 'Pausado', value: 'paused' },
];

const clientFields: INodeProperties[] = [
	...contactFields,
	{
		displayName: 'ID do negócio',
		name: 'businessId',
		type: 'string',
		default: '',
		description: 'ID do negócio ao qual o cliente pertence',
		routing: toBody('business_id'),
	},
	{
		displayName: 'Moeda',
		name: 'currency',
		type: 'options',
		default: 'BRL',
		description: 'Moeda dos números do cliente. O padrão é a moeda da agência.',
		options: CURRENCIES.map((code) => ({ name: code, value: code })),
		routing: toBody('currency'),
	},
	{
		displayName: 'Ocupa vaga',
		name: 'seatActive',
		type: 'boolean',
		default: true,
		description:
			'Se o cliente ocupa uma das vagas da agência. A Blocos recusa quando não sobra vaga.',
		routing: toBody('seat_active'),
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'active',
		options: statusOptions,
		routing: toBody('status'),
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		placeholder: 'ex.: vip, saúde',
		description:
			'Nomes das tags separados por vírgula. As que não existem são criadas. Na atualização, substituem as atuais.',
		routing: toBody('tags', COMMA_LIST_VALUE),
	},
	{
		displayName: 'Fuso horário',
		name: 'timezone',
		type: 'string',
		default: '',
		placeholder: 'ex.: America/Sao_Paulo',
		description: 'Fuso horário IANA do cliente. O padrão é o fuso da agência.',
		routing: toBody('timezone'),
	},
];

export const clientDescription: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Atualizar',
				value: 'update',
				action: 'Atualizar cliente',
				description: 'Atualizar os campos de um cliente',
				routing: apiRequest('PATCH', '=/clients/{{$parameter.clientId}}'),
			},
			{
				name: 'Criar',
				value: 'create',
				action: 'Criar cliente',
				description: 'Criar um novo cliente. O endereço do portal é gerado a partir do nome.',
				routing: apiRequest('POST', '/clients'),
			},
			{
				name: 'Excluir',
				value: 'delete',
				action: 'Excluir cliente',
				description: 'Excluir um cliente e o acesso dele ao portal de forma permanente',
				routing: apiRequest('DELETE', '=/clients/{{$parameter.clientId}}'),
			},
			{
				name: 'Obter',
				value: 'get',
				action: 'Obter cliente',
				description: 'Obter um cliente com as tags e o endereço do portal',
				routing: apiRequest('GET', '=/clients/{{$parameter.clientId}}'),
			},
			{
				name: 'Obter vários',
				value: 'getAll',
				action: 'Obter vários clientes',
				description: 'Obter a lista de clientes',
				routing: apiRequest('GET', '/clients', SPLIT_DATA),
			},
		],
		default: 'getAll',
	},
	{
		...clientSelect,
		displayOptions: { show: { ...show, operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Nome',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ex.: Ana Souza',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('name'),
	},
	{
		displayName: 'Campos adicionais',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: sortByName(clientFields),
	},
	{
		displayName: 'Campos para atualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: sortByName([
			...clientFields,
			{
				displayName: 'Nome',
				name: 'name',
				type: 'string',
				default: '',
				routing: toBody('name'),
			},
		]),
	},
	...paginationFields('client'),
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Busca',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Texto a procurar no nome ou e-mail do cliente',
				routing: toQuery('q'),
			},
			{
				displayName: 'ID do negócio',
				name: 'businessId',
				type: 'string',
				default: '',
				description: 'Somente clientes deste negócio',
				routing: toQuery('business_id'),
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: statusOptions,
				routing: toQuery('status'),
			},
		],
	},
];
