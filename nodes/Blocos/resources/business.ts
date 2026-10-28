import type { INodeProperties } from 'n8n-workflow';
import {
	apiRequest,
	businessSelect,
	contactFields,
	paginationFields,
	sortByName,
	SPLIT_DATA,
	toBody,
	toQuery,
} from '../shared/descriptions';

const show = { resource: ['business'] };

const businessFields: INodeProperties[] = [
	...contactFields,
	{
		displayName: 'CNPJ',
		name: 'cnpj',
		type: 'string',
		default: '',
		placeholder: 'ex.: 12.345.678/0001-90',
		description: 'Número de registro da empresa na Receita Federal',
		routing: toBody('cnpj'),
	},
];

export const businessDescription: INodeProperties[] = [
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
				action: 'Atualizar negócio',
				description: 'Atualizar os campos de um negócio',
				routing: apiRequest('PATCH', '=/businesses/{{$parameter.businessId}}'),
			},
			{
				name: 'Criar',
				value: 'create',
				action: 'Criar negócio',
				description: 'Criar um novo negócio',
				routing: apiRequest('POST', '/businesses'),
			},
			{
				name: 'Excluir',
				value: 'delete',
				action: 'Excluir negócio',
				description: 'Excluir um negócio de forma permanente, com os relatórios e os dados sincronizados',
				routing: apiRequest('DELETE', '=/businesses/{{$parameter.businessId}}'),
			},
			{
				name: 'Obter',
				value: 'get',
				action: 'Obter negócio',
				description: 'Obter um negócio com os clientes e as contas de dados conectadas',
				routing: apiRequest('GET', '=/businesses/{{$parameter.businessId}}'),
			},
			{
				name: 'Obter vários',
				value: 'getAll',
				action: 'Obter vários negócios',
				description: 'Obter a lista de negócios e as fontes de dados conectadas a cada um',
				routing: apiRequest('GET', '/businesses', SPLIT_DATA),
			},
		],
		default: 'getAll',
	},
	{
		...businessSelect,
		displayOptions: { show: { ...show, operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Nome',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ex.: Clínica Acme',
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
		options: sortByName(businessFields),
	},
	{
		displayName: 'Campos para atualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: sortByName([
			...businessFields,
			{
				displayName: 'Nome',
				name: 'name',
				type: 'string',
				default: '',
				routing: toBody('name'),
			},
		]),
	},
	...paginationFields('business'),
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
				description: 'Texto a procurar no nome do negócio',
				routing: toQuery('q'),
			},
		],
	},
];
