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
		name: 'Daily Lead Log',
		value: 'daily_log',
		description: 'Leads and sales the client records in the portal',
	},
	{ name: 'Facebook Page', value: 'facebook_page' },
	{ name: 'Google Ads', value: 'google_ads' },
	{ name: 'Google Analytics 4', value: 'ga4' },
	{ name: 'Google Business Profile', value: 'gbp' },
	{ name: 'Google Search Console', value: 'gsc' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'Meta Ads', value: 'meta_ads' },
	{ name: 'PageSpeed', value: 'pagespeed' },
	{ name: 'Website', value: 'site', description: 'Measurement by the Blocos website tag' },
];

const PERIODS = [
	{ name: 'Today', value: 'today' },
	{ name: 'Yesterday', value: 'yesterday' },
	{ name: 'Last 7 Days', value: 'last_7d' },
	{ name: 'Last 30 Days', value: 'last_30d' },
	{ name: 'Last 90 Days', value: 'last_90d' },
	{ name: 'This Month', value: 'this_month' },
	{ name: 'Last Month', value: 'last_month' },
	{ name: 'Last 6 Months', value: 'last_6m' },
	{ name: 'Last 12 Months', value: 'last_12m' },
	{ name: 'Last 24 Months', value: 'last_24m' },
	{ name: 'Custom Range', value: 'custom' },
];

const PERIOD_OPERATIONS = ['getOverview', 'getSnapshot', 'query'];

function sourceOption(description: string, options = SOURCES): INodeProperties {
	return {
		displayName: 'Source',
		name: 'source',
		type: 'options',
		default: 'meta_ads',
		description,
		options,
	};
}

export const metricDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Daily Series',
				value: 'getDailySeries',
				action: 'Get daily series of business',
				description:
					'Retrieve daily totals (spend, impressions, clicks, reach, video views), one item per day and currency',
				routing: apiRequest('GET', '=/businesses/{{$parameter.businessId}}/daily', SPLIT_DATA),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many metric definitions',
				description: 'Retrieve the metric catalog: ID, name, unit and whether going up is good',
				routing: apiRequest('GET', '/metrics', SPLIT_DATA),
			},
			{
				name: 'Get Overview',
				value: 'getOverview',
				action: 'Get performance overview of business',
				description:
					'Retrieve one source of a business in one call: every metric with its change, campaigns, top ads, audience and regions',
				routing: apiRequest('POST', '/metrics/overview'),
			},
			{
				name: 'Get Snapshot',
				value: 'getSnapshot',
				action: 'Get full snapshot of business',
				description:
					'Retrieve every connected source of a business with daily series, the lead log and active action plans. Heavier than the overview.',
				routing: apiRequest('POST', '/metrics/snapshot'),
			},
			{
				name: 'Query',
				value: 'query',
				action: 'Query metrics of business',
				description:
					'Retrieve metric values for a period, calculated as in the dashboard, with the previous period and the change',
				routing: apiRequest('POST', '/metrics/query'),
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
		displayName: 'Metric Names or IDs',
		name: 'metrics',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getMetrics' },
		default: [],
		description:
			'Metrics to return. Leave empty to return every metric of the source. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { ...show, operation: ['query'] } },
		routing: toBody('metrics'),
	},
	{
		displayName: 'Period',
		name: 'period',
		type: 'options',
		default: 'last_30d',
		options: PERIODS,
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS } },
		routing: toBody('period', '={{ $value === "custom" ? undefined : $value }}'),
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS, period: ['custom'] } },
		routing: toBody('start', DATE_VALUE),
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: PERIOD_OPERATIONS, period: ['custom'] } },
		routing: toBody('end', DATE_VALUE),
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		routing: toQuery('start', DATE_VALUE),
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		routing: toQuery('end', DATE_VALUE),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getOverview', 'query'] } },
		options: [
			{
				displayName: 'Campaign Objectives',
				name: 'objectives',
				type: 'string',
				default: '',
				placeholder: 'e.g. OUTCOME_LEADS, LEAD_GENERATION',
				description: 'Comma-separated Meta campaign objectives to filter campaigns by',
				routing: toBody('objectives', COMMA_LIST_VALUE),
			},
			{
				displayName: 'Compare With Previous Period',
				name: 'compare',
				type: 'boolean',
				default: true,
				description: 'Whether to compare with the previous period of the same length',
				routing: toBody('compare'),
			},
			{
				...sourceOption(
					'Data source to read. Defaults to Meta Ads when connected, otherwise the first one.',
				),
				routing: toBody('source'),
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getSnapshot'] } },
		options: [
			{
				displayName: 'Campaign Objectives',
				name: 'objectives',
				type: 'string',
				default: '',
				placeholder: 'e.g. OUTCOME_LEADS, LEAD_GENERATION',
				description: 'Comma-separated Meta campaign objectives to filter campaigns by',
				routing: toBody('objectives', COMMA_LIST_VALUE),
			},
			{
				displayName: 'Compare With Previous Period',
				name: 'compare',
				type: 'boolean',
				default: true,
				description: 'Whether to compare with the previous period of the same length',
				routing: toBody('compare'),
			},
			{
				displayName: 'Sources',
				name: 'sources',
				type: 'multiOptions',
				default: [],
				description: 'Sources to include. Defaults to every source connected to the business.',
				options: SOURCES,
				routing: toBody('sources'),
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getDailySeries'] } },
		options: [
			{
				displayName: 'Ad Account ID',
				name: 'adAccountId',
				type: 'string',
				default: '',
				description: 'Only this data account, to avoid mixing currencies',
				routing: toQuery('ad_account_id'),
			},
			{
				...sourceOption(
					'Only accounts of this source',
					// The daily lead log has no series here: its totals come from Query.
					SOURCES.filter((source) => source.value !== 'daily_log'),
				),
				routing: toQuery('source'),
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				...sourceOption('Only the metrics of this source'),
				routing: toQuery('source'),
			},
		],
	},
];
