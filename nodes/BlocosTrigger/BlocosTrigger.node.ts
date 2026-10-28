import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { blocosApiRequest } from '../Blocos/shared/transport';
import { isValidSignature } from './signature';

type Webhook = { id: string; url: string; is_active: boolean };

// Nomes do catálogo de eventos da plataforma (lib/platform/events.ts na Blocos).
// "Todos os eventos" também recebe os eventos que a Blocos criar depois desta lista.
const EVENTS = [
	{
		name: 'Ação feita num anúncio',
		value: 'ad.changed',
		action: 'Quando um anúncio for pausado ou reativado',
		description: 'Um anúncio foi pausado ou reativado pela Blocos',
	},
	{
		name: 'Cliente abriu o relatório',
		value: 'report.viewed',
		action: 'Quando o cliente abrir um relatório',
	},
	{ name: 'Cliente alterado', value: 'client.updated', action: 'Quando um cliente for alterado' },
	{
		name: 'Cliente aprovou o relatório',
		value: 'report.approved',
		action: 'Quando o cliente aprovar um relatório',
	},
	{ name: 'Cliente criado', value: 'client.created', action: 'Quando um cliente for criado' },
	{ name: 'Cliente excluído', value: 'client.deleted', action: 'Quando um cliente for excluído' },
	{
		name: 'Cliente pediu ajustes no relatório',
		value: 'report.changes_requested',
		action: 'Quando o cliente pedir ajustes num relatório',
	},
	{
		name: 'Cliente registrou o dia no diário de leads',
		value: 'daily_log.saved',
		action: 'Quando o cliente registrar o dia no diário de leads',
	},
	{
		name: 'Comentário do cliente no portal',
		value: 'portal.comment',
		action: 'Quando o cliente comentar no portal',
	},
	{
		name: 'Comentário numa tarefa',
		value: 'task.commented',
		action: 'Quando alguém comentar numa tarefa',
	},
	{
		name: 'Conexão caiu',
		value: 'connection.expired',
		action: 'Quando uma conexão cair',
		description: 'Uma conexão de dados precisa ser reconectada ou foi revogada',
	},
	{ name: 'Documento criado', value: 'document.created', action: 'Quando um documento for criado' },
	{
		name: 'Documento excluído',
		value: 'document.deleted',
		action: 'Quando um documento for excluído',
	},
	{
		name: 'Formulário respondido',
		value: 'form.submitted',
		action: 'Quando um formulário for respondido',
		description: 'Traz os dados pessoais que a pessoa digitou',
	},
	{
		name: 'Marco registrado na linha do tempo',
		value: 'milestone.created',
		action: 'Quando um marco for registrado na linha do tempo',
		description: 'Um marco foi adicionado à linha do tempo',
	},
	{ name: 'Meta atingida', value: 'plan.target_met', action: 'Quando um plano atingir a meta' },
	{
		name: 'Meta não atingida',
		value: 'plan.target_missed',
		action: 'Quando um plano não atingir a meta',
	},
	{ name: 'Negócio alterado', value: 'business.updated', action: 'Quando um negócio for alterado' },
	{ name: 'Negócio criado', value: 'business.created', action: 'Quando um negócio for criado' },
	{ name: 'Negócio excluído', value: 'business.deleted', action: 'Quando um negócio for excluído' },
	{
		name: 'Plano alterado depois de enviado ou aprovado',
		value: 'plan.changed_after_approval',
		action: 'Quando um plano mudar depois de enviado ou aprovado',
		description: 'O plano mudou depois de enviado ou aprovado e precisa ser enviado de novo',
	},
	{ name: 'Plano aprovado', value: 'plan.approved', action: 'Quando um plano for aprovado' },
	{ name: 'Plano concluído', value: 'plan.completed', action: 'Quando um plano for concluído' },
	{
		name: 'Plano enviado ao cliente',
		value: 'plan.sent',
		action: 'Quando um plano for enviado ao cliente',
	},
	{
		name: 'Plano rejeitado',
		value: 'plan.rejected',
		action: 'Quando um plano for rejeitado',
		description: 'O cliente pediu ajustes',
	},
	{
		name: 'Relatório liberado no portal',
		value: 'report.released',
		action: 'Quando um relatório for liberado no portal',
	},
	{
		name: 'Relatório publicado',
		value: 'report.published',
		action: 'Quando um relatório for publicado',
	},
	{
		name: 'Sinal novo',
		value: 'signal.created',
		action: 'Quando surgir um sinal novo',
		description: 'Um sinal novo do motor proativo ou do resumo semanal',
	},
	{
		name: 'Sincronização diária concluída',
		value: 'sync.completed',
		action: 'Quando a sincronização diária terminar',
		description: 'A sincronização diária dos dados de uma conta terminou',
	},
	{ name: 'Sincronização falhou', value: 'sync.failed', action: 'Quando uma sincronização falhar' },
	{ name: 'Tarefa alterada', value: 'task.updated', action: 'Quando uma tarefa for alterada' },
	{ name: 'Tarefa concluída', value: 'task.completed', action: 'Quando uma tarefa for concluída' },
	{ name: 'Tarefa criada', value: 'task.created', action: 'Quando uma tarefa for criada' },
	{ name: 'Tarefa excluída', value: 'task.deleted', action: 'Quando uma tarefa for excluída' },
	{
		name: 'Tarefa mudou de etapa',
		value: 'task.status_changed',
		action: 'Quando uma tarefa mudar de etapa',
	},
	{
		name: 'Todos os eventos',
		value: '*',
		action: 'Quando qualquer evento acontecer na Blocos',
		description: 'Todos os eventos, inclusive os que a Blocos criar depois',
	},
];

// Only the obvious "this machine" case: Blocos itself refuses every private address.
// URL.hostname keeps IPv6 in brackets.
const LOOPBACK_HOST = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i;

function header(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function subscribedEvents(context: IHookFunctions): string[] {
	const events = context.getNodeParameter('events') as string[];
	return events.includes('*') ? ['*'] : events;
}

// The canvas shows the event names, not the internal values ("task.completed").
const EVENT_NAMES = JSON.stringify(
	Object.fromEntries(EVENTS.map((event) => [event.value, event.name])),
);

export class BlocosTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blocos Marketing Trigger',
		name: 'blocosTrigger',
		icon: { light: 'file:../../icons/blocos.svg', dark: 'file:../../icons/blocos.dark.svg' },
		group: ['trigger'],
		version: 1,
		// Parentheses: right after "=>", a bare "{" would open a function body, not the object.
		subtitle: `={{ $parameter["events"].map((event) => (${EVENT_NAMES})[event] || event).join(", ") }}`,
		description: 'Inicia o fluxo quando algo acontece na Blocos',
		defaults: {
			name: 'Blocos Marketing Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'blocosApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'A chave de API precisa de acesso de escrita e de um cargo com a permissão "Gerenciar API, webhooks e apps conectados (MCP)": ativar o fluxo registra um webhook na Blocos, e desativar remove o webhook',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				// The n8n node panel lists a trigger's events (from each option's `action`) only
				// when this label is "Event", "Events" or "Trigger On" (n8n editor, actions parser).
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Os eventos a escutar',
				options: EVENTS,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId || !webhookData.webhookSecret) return false;

				const { data: webhooks } = await blocosApiRequest<{ data: Webhook[] }>(
					this,
					'GET',
					'/webhooks',
				);
				const webhook = webhooks.find((item) => item.id === webhookData.webhookId);
				if (!webhook) {
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
					return false;
				}

				const url = this.getNodeWebhookUrl('default') as string;
				if (webhook.is_active && webhook.url === url) return true;
				// Switched off by Blocos after repeated failed deliveries, or n8n moved to another
				// address: turn it back on in place, keeping its secret and its delivery history.
				await blocosApiRequest(this, 'PATCH', `/webhooks/${webhook.id}`, {
					body: { url, events: subscribedEvents(this), is_active: true },
				});
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				if (LOOPBACK_HOST.test(new URL(webhookUrl).hostname)) {
					throw new NodeOperationError(
						this.getNode(),
						'A Blocos só entrega eventos num endereço público',
						{
							description:
								'Este n8n só pode ser acessado nesta máquina. Defina a variável de ambiente N8N_WEBHOOK_URL do n8n (WEBHOOK_URL antes do n8n 2.x) com o endereço público dele e ative o fluxo de novo.',
						},
					);
				}

				const workflowName = this.getWorkflow().name ?? 'fluxo';
				let webhook: Webhook & { secret: string };
				try {
					webhook = await blocosApiRequest<Webhook & { secret: string }>(
						this,
						'POST',
						'/webhooks',
						{
							body: {
								url: webhookUrl,
								events: subscribedEvents(this),
								description: `n8n: ${workflowName}`.slice(0, 200),
							},
						},
					);
				} catch (error) {
					// The Blocos reason (e.g. the missing permission) comes in the description.
					const reason = (error as { description?: string }).description;
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: reason
							? `A Blocos não registrou o webhook: ${reason}`
							: 'A Blocos não registrou o webhook',
						description:
							'Confira se a chave de API tem acesso de escrita, se o cargo dela tem a permissão "Gerenciar API, webhooks e apps conectados (MCP)" e se o endereço do webhook do n8n é público.',
					});
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id;
				webhookData.webhookSecret = webhook.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId) {
					try {
						await blocosApiRequest(this, 'DELETE', `/webhooks/${webhookData.webhookId as string}`);
					} catch (error) {
						// Already removed in Blocos: nothing left to clean up there.
						const { httpCode, message } = error as { httpCode?: string; message?: string };
						if (httpCode !== '404') {
							// Only message and status: the error object can carry the request headers (the API key).
							this.logger.warn('A Blocos não removeu o webhook', { httpCode, message });
							return false;
						}
					}
				}
				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const headers = this.getHeaderData();
		const valid = isValidSignature({
			secret: this.getWorkflowStaticData('node').webhookSecret as string | undefined,
			rawBody: request.rawBody,
			signature: header(headers['x-webhook-signature']),
			timestamp: header(headers['x-webhook-timestamp']),
			nowSeconds: Math.floor(Date.now() / 1000),
		});
		if (!valid) {
			const response = this.getResponseObject();
			response.status(401).send('Assinatura inválida').end();
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData() as IDataObject)],
		};
	}
}
