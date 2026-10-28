import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { listSearch, loadOptions } from './methods';
import { actionPlanDescription } from './resources/actionPlan';
import { businessDescription } from './resources/business';
import { clientDescription } from './resources/client';
import { metricDescription } from './resources/metric';
import { reportDescription } from './resources/report';
import { taskDescription } from './resources/task';

const resourceProperties: INodeProperties[] = [
	...actionPlanDescription,
	...businessDescription,
	...clientDescription,
	...metricDescription,
	...reportDescription,
	...taskDescription,
];

// The canvas shows the operation's action ("Obter vários negócios"), not the internal
// values ("getAll: business"). Keyed by "resource:operation".
const ACTIONS = JSON.stringify(
	Object.fromEntries(
		resourceProperties
			.filter((property) => property.name === 'operation')
			.flatMap((property) =>
				(property.options ?? []).map((option) => [
					`${property.displayOptions?.show?.resource?.[0]}:${'value' in option ? option.value : ''}`,
					'action' in option ? option.action : undefined,
				]),
			),
	),
);

export class Blocos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blocos Marketing',
		name: 'blocos',
		icon: { light: 'file:../../icons/blocos.svg', dark: 'file:../../icons/blocos.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: `={{ ${ACTIONS}[$parameter["resource"] + ":" + $parameter["operation"]] }}`,
		description:
			'Trabalhe com negócios, clientes, tarefas, planos de ação, relatórios e métricas da Blocos',
		defaults: {
			name: 'Blocos Marketing',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'blocosApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			// Error responses reach the operation's postReceive, which raises them with the
			// Blocos message (shared/descriptions.ts, apiRequest).
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Recurso',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Cliente', value: 'client' },
					{ name: 'Métrica', value: 'metric' },
					{ name: 'Negócio', value: 'business' },
					{ name: 'Plano de ação', value: 'actionPlan' },
					{ name: 'Relatório', value: 'report' },
					{ name: 'Tarefa', value: 'task' },
				],
				default: 'task',
			},
			...resourceProperties,
		],
	};

	methods = {
		listSearch,
		loadOptions,
	};
}
