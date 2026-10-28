import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { listSearch, loadOptions } from './methods';
import { actionPlanDescription } from './resources/actionPlan';
import { businessDescription } from './resources/business';
import { clientDescription } from './resources/client';
import { metricDescription } from './resources/metric';
import { reportDescription } from './resources/report';
import { taskDescription } from './resources/task';

export class Blocos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blocos Marketing',
		name: 'blocos',
		icon: { light: 'file:../../icons/blocos.svg', dark: 'file:../../icons/blocos.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
			...actionPlanDescription,
			...businessDescription,
			...clientDescription,
			...metricDescription,
			...reportDescription,
			...taskDescription,
		],
	};

	methods = {
		listSearch,
		loadOptions,
	};
}
