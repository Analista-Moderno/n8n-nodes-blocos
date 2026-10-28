import {
	NodeApiError,
	type IExecuteSingleFunctions,
	type IHttpRequestMethods,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type INodePropertyRouting,
	type JsonObject,
	type PostReceiveAction,
} from 'n8n-workflow';

const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

// The API takes plain dates (YYYY-MM-DD); the date picker gives "YYYY-MM-DDT00:00:00".
export const DATE_VALUE = '={{ String($value).slice(0, 10) }}';
export const COMMA_LIST_VALUE =
	'={{ String($value).split(",").map((item) => item.trim()).filter((item) => item) }}';
export const LINE_LIST_VALUE =
	'={{ String($value).split(/\\r?\\n/).map((item) => item.trim()).filter((item) => item) }}';

/** Collection fields in alphabetical order, as n8n lists them, after merging shared and specific ones. */
export function sortByName(fields: INodeProperties[]): INodeProperties[] {
	return [...fields].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function toBody(property: string, value?: string): INodePropertyRouting {
	return { send: { type: 'body', property, ...(value ? { value } : {}) } };
}

export function toQuery(property: string, value?: string): INodePropertyRouting {
	return { send: { type: 'query', property, ...(value ? { value } : {}) } };
}

/** Splits the `{ data: [...] }` envelope of list endpoints into one item per record. */
export const SPLIT_DATA: PostReceiveAction[] = [
	{ type: 'rootProperty', properties: { property: 'data' } },
];

/**
 * Blocos explains every refusal in `error.message`: what is wrong and where to fix it.
 * The node runs with `ignoreHttpStatusErrors`, so that text becomes the error message and
 * also reaches the items of a node set to continue on error, which would otherwise get
 * only n8n's generic text for the status code.
 */
async function throwBlocosError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) return items;
	const body = response.body as { error?: { code?: string; message?: string } } | string | null;
	const error = typeof body === 'object' ? body?.error : undefined;
	throw new NodeApiError(
		this.getNode(),
		(typeof body === 'object' && body ? body : {}) as JsonObject,
		{
			message: error?.message ?? `A Blocos respondeu com o status ${response.statusCode}`,
			description: error?.code ? `Código de erro da Blocos: ${error.code}` : undefined,
			httpCode: String(response.statusCode),
		},
	);
}

/** Routing of an operation: the request plus the shared error check before any other step. */
export function apiRequest(
	method: IHttpRequestMethods,
	url: string,
	postReceive: PostReceiveAction[] = [],
): INodePropertyRouting {
	return { request: { method, url }, output: { postReceive: [throwBlocosError, ...postReceive] } };
}

function idSelect(
	displayName: string,
	name: string,
	searchListMethod: string,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		modes: [
			{
				displayName: 'Da lista',
				name: 'list',
				type: 'list',
				placeholder: 'Selecione na lista...',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'Por ID',
				name: 'id',
				type: 'string',
				placeholder: 'ex.: 0b6c7c8e-1f0a-4f8e-9a51-6d2b5c3e9f10',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: UUID,
							errorMessage: `ID de ${displayName.toLowerCase()} inválido`,
						},
					},
				],
			},
		],
	};
}

export const businessSelect = idSelect(
	'Negócio',
	'businessId',
	'getBusinesses',
	'O negócio (a empresa que paga pela mídia) a usar',
);

export const clientSelect = idSelect('Cliente', 'clientId', 'getClients', 'O cliente a usar');

/** "Return All" + "Limit" for Get Many operations of endpoints paginated with limit/offset. */
export function paginationFields(resource: string): INodeProperties[] {
	const show = { resource: [resource], operation: ['getAll'] };
	return [
		{
			displayName: 'Retornar todos',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Se deve retornar todos os resultados ou só até o limite informado',
			displayOptions: { show },
			routing: {
				send: { paginate: '={{ $value }}' },
				operations: {
					pagination: {
						type: 'offset',
						properties: {
							limitParameter: 'limit',
							offsetParameter: 'offset',
							pageSize: 100,
							type: 'query',
						},
					},
				},
			},
		},
		{
			displayName: 'Limite',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1, maxValue: 500 },
			description: 'Número máximo de resultados a retornar',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

/** Contact and address fields shared by businesses and clients. */
export const contactFields: INodeProperties[] = [
	{
		displayName: 'Endereço',
		name: 'address',
		type: 'string',
		default: '',
		placeholder: 'ex.: Rua Augusta',
		routing: toBody('address'),
	},
	{
		displayName: 'Número',
		name: 'addressNumber',
		type: 'string',
		default: '',
		placeholder: 'ex.: 1500',
		routing: toBody('address_number'),
	},
	{
		displayName: 'Cidade',
		name: 'city',
		type: 'string',
		default: '',
		placeholder: 'ex.: São Paulo',
		routing: toBody('city'),
	},
	{
		displayName: 'E-mail',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'ex.: ana@agencia.com.br',
		routing: toBody('email'),
	},
	{
		displayName: 'Bairro',
		name: 'neighborhood',
		type: 'string',
		default: '',
		placeholder: 'ex.: Consolação',
		routing: toBody('neighborhood'),
	},
	{
		displayName: 'Telefone',
		name: 'phone',
		type: 'string',
		default: '',
		placeholder: 'ex.: +55 11 99999-0000',
		routing: toBody('phone'),
	},
	{
		displayName: 'CEP',
		name: 'postalCode',
		type: 'string',
		default: '',
		placeholder: 'ex.: 01305-100',
		routing: toBody('postal_code'),
	},
];
