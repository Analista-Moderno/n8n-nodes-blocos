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
	{ name: 'Active', value: 'active' },
	{ name: 'Archived', value: 'archived' },
	{ name: 'Paused', value: 'paused' },
];

const clientFields: INodeProperties[] = [
	...contactFields,
	{
		displayName: 'Business ID',
		name: 'businessId',
		type: 'string',
		default: '',
		description: 'ID of the business this client belongs to',
		routing: toBody('business_id'),
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'options',
		default: 'BRL',
		description: "Currency of the client's numbers. Defaults to the agency currency.",
		options: CURRENCIES.map((code) => ({ name: code, value: code })),
		routing: toBody('currency'),
	},
	{
		displayName: 'Occupies a Seat',
		name: 'seatActive',
		type: 'boolean',
		default: true,
		description:
			'Whether the client occupies one of the agency seats. Blocos refuses it when no seat is left.',
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
		placeholder: 'e.g. vip, health',
		description:
			'Comma-separated tag names. Missing tags are created. On update, replaces the current tags.',
		routing: toBody('tags', COMMA_LIST_VALUE),
	},
	{
		displayName: 'Time Zone',
		name: 'timezone',
		type: 'string',
		default: '',
		placeholder: 'e.g. America/Sao_Paulo',
		description: 'IANA time zone of the client. Defaults to the agency time zone.',
		routing: toBody('timezone'),
	},
];

export const clientDescription: INodeProperties[] = [
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
				action: 'Create client',
				description: 'Create a new client. The portal address is generated from the name.',
				routing: apiRequest('POST', '/clients'),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete client',
				description: 'Permanently delete a client and its portal access',
				routing: apiRequest('DELETE', '=/clients/{{$parameter.clientId}}'),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get client',
				description: 'Retrieve a client with tags and the portal address',
				routing: apiRequest('GET', '=/clients/{{$parameter.clientId}}'),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many clients',
				description: 'Retrieve a list of clients',
				routing: apiRequest('GET', '/clients', SPLIT_DATA),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update client',
				description: 'Update the fields of a client',
				routing: apiRequest('PATCH', '=/clients/{{$parameter.clientId}}'),
			},
		],
		default: 'getAll',
	},
	{
		...clientSelect,
		displayOptions: { show: { ...show, operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Nathan Smith',
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
		options: sortByName(clientFields),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: sortByName([
			...clientFields,
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: toBody('name'),
			},
		]),
	},
	...paginationFields('client'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Business ID',
				name: 'businessId',
				type: 'string',
				default: '',
				description: 'Only clients of this business',
				routing: toQuery('business_id'),
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to look for in the client name or email',
				routing: toQuery('q'),
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
