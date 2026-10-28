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
		placeholder: 'e.g. 12.345.678/0001-90',
		description: 'Brazilian company registration number',
		routing: toBody('cnpj'),
	},
];

export const businessDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create business',
				description: 'Create a new business',
				routing: apiRequest('POST', '/businesses'),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete business',
				description: 'Permanently delete a business with its reports and synced data',
				routing: apiRequest('DELETE', '=/businesses/{{$parameter.businessId}}'),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get business',
				description: 'Retrieve a business with its clients and connected data accounts',
				routing: apiRequest('GET', '=/businesses/{{$parameter.businessId}}'),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many businesses',
				description: 'Retrieve a list of businesses and the data sources connected to each',
				routing: apiRequest('GET', '/businesses', SPLIT_DATA),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update business',
				description: 'Update the fields of a business',
				routing: apiRequest('PATCH', '=/businesses/{{$parameter.businessId}}'),
			},
		],
		default: 'getAll',
	},
	{
		...businessSelect,
		displayOptions: { show: { ...show, operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme Clinic',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('name'),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: sortByName(businessFields),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: sortByName([
			...businessFields,
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: toBody('name'),
			},
		]),
	},
	...paginationFields('business'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to look for in the business name',
				routing: toQuery('q'),
			},
		],
	},
];
