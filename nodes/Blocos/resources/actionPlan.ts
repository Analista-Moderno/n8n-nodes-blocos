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

const memberDescription = 'E-mail, nome ou ID de uma pessoa da equipe da agência';

/** Optional measurement window; without it Blocos computes the window itself. */
function windowFields(
	operation: string,
	window: { start: string; end: string; of: string },
): INodeProperties {
	return {
		displayName: 'Opções',
		name: 'options',
		type: 'collection',
		placeholder: 'Adicionar opção',
		default: {},
		displayOptions: { show: { ...show, operation: [operation] } },
		options: [
			{
				displayName: window.end,
				name: 'end',
				type: 'dateTime',
				default: '',
				description: `Último dia da janela ${window.of}. Use junto com o início.`,
				routing: toBody('end', DATE_VALUE),
			},
			{
				displayName: window.start,
				name: 'start',
				type: 'dateTime',
				default: '',
				description: `Primeiro dia da janela ${window.of}. Sem início e fim, a Blocos calcula a janela.`,
				routing: toBody('start', DATE_VALUE),
			},
		],
	};
}

export const actionPlanDescription: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Criar',
				value: 'create',
				action: 'Criar plano de ação',
				description:
					'Criar um plano de ação em rascunho, ancorado numa métrica de um negócio, com meta e prazo',
				routing: apiRequest('POST', '/plans'),
			},
			{
				name: 'Enviar ao cliente',
				value: 'send',
				action: 'Enviar plano de ação ao cliente',
				description: 'Congelar a base e enviar o plano para aprovação no portal do cliente',
				routing: apiRequest('POST', '=/plans/{{$parameter.planId}}/send'),
			},
			{
				name: 'Obter',
				value: 'get',
				action: 'Obter plano de ação',
				description: 'Obter um plano de ação com a métrica-alvo, a base e o resultado congelado',
				routing: apiRequest('GET', '=/plans/{{$parameter.planId}}'),
			},
			{
				name: 'Obter vários',
				value: 'getAll',
				action: 'Obter vários planos de ação',
				description: 'Obter a lista de planos de ação e em que ponto da aprovação cada um está',
				routing: apiRequest('GET', '/plans', SPLIT_DATA),
			},
			{
				name: 'Registrar resultado',
				value: 'recordResult',
				action: 'Registrar resultado do plano de ação',
				description:
					'Congelar o resultado da métrica, compará-lo com a base e a meta, e concluir o plano',
				routing: apiRequest('POST', '=/plans/{{$parameter.planId}}/conclude'),
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'ID do plano de ação',
		name: 'planId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ex.: 0b6c7c8e-1f0a-4f8e-9a51-6d2b5c3e9f10',
		displayOptions: { show: { ...show, operation: ['get', 'recordResult', 'send'] } },
	},
	{
		...businessSelect,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('business_id'),
	},
	{
		displayName: 'Métrica (nome ou ID)',
		name: 'metricId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getMetrics' },
		required: true,
		default: '',
		description:
			'Métrica que o plano pretende mover. Escolha na lista ou informe um ID usando uma <a href="https://docs.n8n.io/code/expressions/">expressão</a>.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('metric_id'),
	},
	{
		displayName: 'Por quê',
		name: 'why',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		placeholder: 'ex.: O custo por lead subiu 40% depois que o criativo cansou',
		description: 'O diagnóstico que justifica o plano',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: toBody('why'),
	},
	{
		displayName: 'Campos adicionais',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Aprovador',
				name: 'approver',
				type: 'string',
				default: '',
				placeholder: 'ex.: ana@agencia.com.br',
				description: memberDescription,
				routing: toBody('approver'),
			},
			{
				displayName: 'Data da meta',
				name: 'targetHorizonEnd',
				type: 'dateTime',
				default: '',
				description: 'Quando a meta deve ser lida',
				routing: toBody('target_horizon_end', DATE_VALUE),
			},
			{
				displayName: 'Data de início',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				routing: toBody('start_date', DATE_VALUE),
			},
			{
				displayName: 'Descrição',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'Como, onde e quanto, em Markdown',
				routing: toBody('description'),
			},
			{
				displayName: 'ID do cliente',
				name: 'clientId',
				type: 'string',
				default: '',
				description:
					'Cliente que aprova o plano. O padrão é o cliente do negócio, quando ele tem só um.',
				routing: toBody('client_id'),
			},
			{
				displayName: 'Prazo',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				routing: toBody('due_date', DATE_VALUE),
			},
			{
				displayName: 'Responsável',
				name: 'assignee',
				type: 'string',
				default: '',
				placeholder: 'ex.: ana@agencia.com.br',
				description: memberDescription,
				routing: toBody('assignee'),
			},
			{
				displayName: 'Título',
				name: 'title',
				type: 'string',
				default: '',
				description: 'O que é o plano. O padrão é o nome da métrica e o negócio.',
				routing: toBody('title'),
			},
			{
				displayName: 'Valor da meta',
				name: 'targetValue',
				type: 'number',
				typeOptions: { numberPrecision: 4 },
				default: 0,
				description:
					'Meta da métrica, na unidade dela. Percentuais são frações (0.02 = 2%).',
				routing: toBody('target_value'),
			},
		],
	},
	windowFields('send', { start: 'Início da base', end: 'Fim da base', of: 'da base' }),
	windowFields('recordResult', {
		start: 'Início do resultado',
		end: 'Fim do resultado',
		of: 'do resultado',
	}),
	...paginationFields('actionPlan'),
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'ID do cliente',
				name: 'clientId',
				type: 'string',
				default: '',
				routing: toQuery('client_id'),
			},
			{
				displayName: 'ID do negócio',
				name: 'businessId',
				type: 'string',
				default: '',
				routing: toQuery('business_id'),
			},
			{
				displayName: 'Somente abertos',
				name: 'openOnly',
				type: 'boolean',
				default: true,
				description: 'Se deve retornar só os planos que não foram concluídos',
				routing: toQuery('open_only'),
			},
			{
				displayName: 'Status da aprovação',
				name: 'approval',
				type: 'options',
				default: 'sent',
				options: [
					{
						name: 'Alterado depois da aprovação',
						value: 'changed_after_approval',
						description: 'Alterado depois de enviado ou aprovado; precisa ser enviado de novo',
					},
					{ name: 'Aprovado', value: 'approved' },
					{ name: 'Enviado', value: 'sent', description: 'Aguardando o cliente' },
					{ name: 'Rascunho', value: 'draft' },
					{ name: 'Rejeitado', value: 'rejected', description: 'O cliente pediu ajustes' },
				],
				routing: toQuery('approval'),
			},
		],
	},
];
