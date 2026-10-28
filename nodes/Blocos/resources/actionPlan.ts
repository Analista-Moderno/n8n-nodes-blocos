import type { INodeProperties } from 'n8n-workflow';
import {
	apiRequest,
	businessSelect,
	DATE_VALUE,
	paginationFields,
	SPLIT_DATA,
	toBody,
	toQuery,
} from '../shared/descriptions';

const show = { resource: ['actionPlan'] };

const memberDescription = 'Email, name or ID of a member of the agency team';

/** Optional measurement window; without it Blocos computes the window itself. */
function windowFields(operation: string, label: string): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: [operation] } },
		options: [
			{
				displayName: `${label} End`,
				name: 'end',
				type: 'dateTime',
				default: '',
				description: `Last day of the ${label.toLowerCase()} window. Use together with the start.`,
				routing: toBody('end', DATE_VALUE),
			},
			{
				displayName: `${label} Start`,
				name: 'start',
				type: 'dateTime',
				default: '',
				description: `First day of the ${label.toLowerCase()} window. Without start and end, Blocos computes the window.`,
				routing: toBody('start', DATE_VALUE),
			},
		],
	};
}

export const actionPlanDescription: INodeProperties[] = [
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
				action: 'Create action plan',
				description:
					'Create a draft action plan anchored on a metric of a business, with target and deadline',
				routing: apiRequest('POST', '/plans'),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get action plan',
				description: 'Retrieve an action plan with target metric, baseline and frozen result',
				routing: apiRequest('GET', '=/plans/{{$parameter.planId}}'),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many action plans',
				description: 'Retrieve a list of action plans and where each one is in the approval',
				routing: apiRequest('GET', '/plans', SPLIT_DATA),
			},
			{
				name: 'Record Result',
				value: 'recordResult',
				action: 'Record result of action plan',
				description:
					'Freeze the metric result, compare it with the baseline and the target, and complete the plan',
				routing: apiRequest('POST', '=/plans/{{$parameter.planId}}/conclude'),
			},
			{
				name: 'Send to Client',
				value: 'send',
				action: 'Send action plan to client',
				description: 'Freeze the baseline and send the plan for approval in the client portal',
				routing: apiRequest('POST', '=/plans/{{$parameter.planId}}/send'),
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Action Plan ID',
		name: 'planId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 0b6c7c8e-1f0a-4f8e-9a51-6d2b5c3e9f10',
		displayOptions: { show: { ...show, operation: ['get', 'recordResult', 'send'] } },
	},
	{
		...businessSelect,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('business_id'),
	},
	{
		displayName: 'Metric Name or ID',
		name: 'metricId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getMetrics' },
		required: true,
		default: '',
		description:
			'Metric the plan intends to move. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('metric_id'),
	},
	{
		displayName: 'Why',
		name: 'why',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		placeholder: 'e.g. Cost per lead rose 40% after the creative fatigued',
		description: 'The diagnosis that justifies the plan',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('why'),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Approver',
				name: 'approver',
				type: 'string',
				default: '',
				placeholder: 'e.g. nathan@example.com',
				description: memberDescription,
				routing: toBody('approver'),
			},
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'string',
				default: '',
				placeholder: 'e.g. nathan@example.com',
				description: memberDescription,
				routing: toBody('assignee'),
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				description:
					'Client that approves the plan. Defaults to the client of the business when it has only one.',
				routing: toBody('client_id'),
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'How, where and how much, in Markdown',
				routing: toBody('description'),
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				routing: toBody('due_date', DATE_VALUE),
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				routing: toBody('start_date', DATE_VALUE),
			},
			{
				displayName: 'Target Date',
				name: 'targetHorizonEnd',
				type: 'dateTime',
				default: '',
				description: 'When the target should be read',
				routing: toBody('target_horizon_end', DATE_VALUE),
			},
			{
				displayName: 'Target Value',
				name: 'targetValue',
				type: 'number',
				typeOptions: { numberPrecision: 4 },
				default: 0,
				description:
					'Target of the metric, in its own unit. Percentages are fractions (0.02 = 2%).',
				routing: toBody('target_value'),
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'What the plan is. Defaults to the metric name and the business.',
				routing: toBody('title'),
			},
		],
	},
	windowFields('send', 'Baseline'),
	windowFields('recordResult', 'Result'),
	...paginationFields('actionPlan'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Approval Status',
				name: 'approval',
				type: 'options',
				default: 'sent',
				options: [
					{ name: 'Approved', value: 'approved' },
					{
						name: 'Changed After Approval',
						value: 'changed_after_approval',
						description: 'Changed after it was sent or approved; needs to be sent again',
					},
					{ name: 'Draft', value: 'draft' },
					{ name: 'Rejected', value: 'rejected', description: 'The client asked for changes' },
					{ name: 'Sent', value: 'sent', description: 'Waiting for the client' },
				],
				routing: toQuery('approval'),
			},
			{
				displayName: 'Business ID',
				name: 'businessId',
				type: 'string',
				default: '',
				routing: toQuery('business_id'),
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				routing: toQuery('client_id'),
			},
			{
				displayName: 'Only Open',
				name: 'openOnly',
				type: 'boolean',
				default: true,
				description: 'Whether to return only plans that are not completed',
				routing: toQuery('open_only'),
			},
		],
	},
];
