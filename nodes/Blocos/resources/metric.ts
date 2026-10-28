import type { INodeProperties } from 'n8n-workflow';
import {
	apiRequest,
	businessSelect,
	COMMA_LIST_VALUE,
	DATE_VALUE,
	SPLIT_DATA,
	toBody,
	toQuery,
} from '../shared/descriptions';

const show = { resource: ['metric'] };

const SOURCES = [
	{
		name: 'Diário de leads',
		value: 'daily_log',
		description: 'Leads e vendas que o cliente registra no portal',
	},
	{ name: 'Google Ads', value: 'google_ads' },
	{ name: 'Google Analytics 4', value: 'ga4' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'Meta Ads', value: 'meta_ads' },
	{ name: 'PageSpeed', value: 'pagespeed' },
	{ name: 'Página do Facebook', value: 'facebook_page' },
	{ name: 'Perfil da Empresa no Google', value: 'gbp' },
	{ name: 'Search Console', value: 'gsc' },
	{ name: 'Site', value: 'site', description: 'Medição pela tag do site da Blocos' },
];

const PERIODS = [
	{ name: 'Hoje', value: 'today' },
	{ name: 'Ontem', value: 'yesterday' },
	{ name: 'Últimos 7 dias', value: 'last_7d' },
	{ name: 'Últimos 30 dias', value: 'last_30d' },
	{ name: 'Últimos 90 dias', value: 'last_90d' },
	{ name: 'Este mês', value: 'this_month' },
	{ name: 'Mês passado', value: 'last_month' },
	{ name: 'Últimos 6 meses', value: 'last_6m' },
	{ name: 'Últimos 12 meses', value: 'last_12m' },
	{ name: 'Últimos 24 meses', value: 'last_24m' },
	{ name: 'Período personalizado', value: 'custom' },
];

const PERIOD_OPERATIONS = ['getOverview', 'getSnapshot', 'query'];

function sourceOption(description: string, options = SOURCES): INodeProperties {
	return {
		displayName: 'Fonte',
		name: 'source',
		type: 'options',
		default: 'meta_ads',
		description,
		options,
	};
}

export const metricDescription: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Consultar',
				value: 'query',
				action: 'Consultar métricas de um negócio',
				description:
					'Obter os valores de métricas de um período, calculados como no painel, com o período anterior e a variação',
				routing: apiRequest('POST', '/metrics/query'),
			},
			{
				name: 'Obter retrato completo',
				value: 'getSnapshot',
				action: 'Obter retrato completo de um negócio',
				description:
					'Obter todas as fontes conectadas de um negócio com as séries diárias, o diário de leads e os planos de ação ativos. Mais pesado que a visão geral.',
				routing: apiRequest('POST', '/metrics/snapshot'),
			},
			{
				name: 'Obter série diária',
				value: 'getDailySeries',
				action: 'Obter série diária de um negócio',
				description:
					'Obter os totais diários (investimento, impressões, cliques, alcance, visualizações de vídeo), um item por dia e moeda',
				routing: apiRequest('GET', '=/businesses/{{$parameter.businessId}}/daily', SPLIT_DATA),
			},
			{
				name: 'Obter vários',
				value: 'getAll',
				action: 'Obter definições de métricas',
				description: 'Obter o catálogo de métricas: ID, nome, unidade e se subir é bom',
				routing: apiRequest('GET', '/metrics', SPLIT_DATA),
			},
			{
				name: 'Obter visão geral',
				value: 'getOverview',
				action: 'Obter visão geral de desempenho de um negócio',
				description:
					'Obter uma fonte de um negócio numa chamada só: todas as métricas com a variação, campanhas, melhores anúncios, público e regiões',
				routing: apiRequest('POST', '/metrics/overview'),
			},
		],
		default: 'query',
	},
	{
		...businessSelect,
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS } },
		routing: toBody('business_id'),
	},
	{
		// Goes in the URL of the daily series request.
		...businessSelect,
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
	},
	{
		displayName: 'Métricas (nomes ou IDs)',
		name: 'metrics',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getMetrics' },
		default: [],
		description:
			'Métricas a retornar. Deixe vazio para retornar todas as métricas da fonte. Escolha na lista ou informe IDs usando uma <a href="https://docs.n8n.io/code/expressions/">expressão</a>.',
		displayOptions: { show: { ...show, operation: ['query'] } },
		routing: toBody('metrics'),
	},
	{
		displayName: 'Período',
		name: 'period',
		type: 'options',
		default: 'last_30d',
		options: PERIODS,
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS } },
		routing: toBody('period', '={{ $value === "custom" ? undefined : $value }}'),
	},
	{
		displayName: 'Data inicial',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS, period: ['custom'] } },
		routing: toBody('start', DATE_VALUE),
	},
	{
		displayName: 'Data final',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS, period: ['custom'] } },
		routing: toBody('end', DATE_VALUE),
	},
	{
		displayName: 'Data inicial',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		routing: toQuery('start', DATE_VALUE),
	},
	{
		displayName: 'Data final',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		routing: toQuery('end', DATE_VALUE),
	},
	{
		displayName: 'Opções',
		name: 'options',
		type: 'collection',
		placeholder: 'Adicionar opção',
		default: {},
		displayOptions: { show: { ...show, operation: ['getOverview', 'query'] } },
		options: [
			{
				displayName: 'Objetivos de campanha',
				name: 'objectives',
				type: 'string',
				default: '',
				placeholder: 'ex.: OUTCOME_LEADS, LEAD_GENERATION',
				description: 'Objetivos de campanha do Meta separados por vírgula, para filtrar as campanhas',
				routing: toBody('objectives', COMMA_LIST_VALUE),
			},
			{
				displayName: 'Comparar com o período anterior',
				name: 'compare',
				type: 'boolean',
				default: true,
				description: 'Se deve comparar com o período anterior de mesma duração',
				routing: toBody('compare'),
			},
			{
				...sourceOption(
					'Fonte de dados a ler. O padrão é o Meta Ads quando conectado; senão, a primeira.',
				),
				routing: toBody('source'),
			},
		],
	},
	{
		displayName: 'Opções',
		name: 'options',
		type: 'collection',
		placeholder: 'Adicionar opção',
		default: {},
		displayOptions: { show: { ...show, operation: ['getSnapshot'] } },
		options: [
			{
				displayName: 'Objetivos de campanha',
				name: 'objectives',
				type: 'string',
				default: '',
				placeholder: 'ex.: OUTCOME_LEADS, LEAD_GENERATION',
				description: 'Objetivos de campanha do Meta separados por vírgula, para filtrar as campanhas',
				routing: toBody('objectives', COMMA_LIST_VALUE),
			},
			{
				displayName: 'Comparar com o período anterior',
				name: 'compare',
				type: 'boolean',
				default: true,
				description: 'Se deve comparar com o período anterior de mesma duração',
				routing: toBody('compare'),
			},
			{
				displayName: 'Fontes',
				name: 'sources',
				type: 'multiOptions',
				default: [],
				description: 'Fontes a incluir. O padrão é toda fonte conectada ao negócio.',
				options: SOURCES,
				routing: toBody('sources'),
			},
		],
	},
	{
		displayName: 'Opções',
		name: 'options',
		type: 'collection',
		placeholder: 'Adicionar opção',
		default: {},
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		options: [
			{
				displayName: 'ID da conta de anúncios',
				name: 'adAccountId',
				type: 'string',
				default: '',
				description: 'Somente esta conta de dados, para não misturar moedas',
				routing: toQuery('ad_account_id'),
			},
			{
				...sourceOption(
					'Somente contas desta fonte',
					// The daily lead log has no series here: its totals come from Query.
					SOURCES.filter((source) => source.value !== 'daily_log'),
				),
				routing: toQuery('source'),
			},
		],
	},
	{
		displayName: 'Opções',
		name: 'options',
		type: 'collection',
		placeholder: 'Adicionar opção',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				...sourceOption('Somente as métricas desta fonte'),
				routing: toQuery('source'),
			},
		],
	},
];
