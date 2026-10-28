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

// English names for the platform event catalog (lib/platform/events.ts in Blocos).
// "All Events" also receives events added to Blocos after this list.
const EVENTS = [
	{ name: 'Action Plan Approved', value: 'plan.approved' },
	{
		name: 'Action Plan Changed After Approval',
		value: 'plan.changed_after_approval',
		description: 'The plan changed after it was sent or approved and must be sent again',
	},
	{ name: 'Action Plan Completed', value: 'plan.completed' },
	{
		name: 'Action Plan Rejected',
		value: 'plan.rejected',
		description: 'The client asked for changes',
	},
	{ name: 'Action Plan Sent to Client', value: 'plan.sent' },
	{ name: 'Action Plan Target Met', value: 'plan.target_met' },
	{ name: 'Action Plan Target Missed', value: 'plan.target_missed' },
	{
		name: 'Ad Changed',
		value: 'ad.changed',
		description: 'An ad was paused or reactivated through Blocos',
	},
	{
		name: 'All Events',
		value: '*',
		description: 'Every event, including ones added to Blocos later',
	},
	{ name: 'Business Created', value: 'business.created' },
	{ name: 'Business Deleted', value: 'business.deleted' },
	{ name: 'Business Updated', value: 'business.updated' },
	{ name: 'Client Created', value: 'client.created' },
	{ name: 'Client Deleted', value: 'client.deleted' },
	{ name: 'Client Updated', value: 'client.updated' },
	{
		name: 'Connection Expired',
		value: 'connection.expired',
		description: 'A data connection needs to be reconnected or was revoked',
	},
	{
		name: 'Daily Lead Log Saved',
		value: 'daily_log.saved',
		description: 'The client recorded the day in the lead log',
	},
	{ name: 'Document Created', value: 'document.created' },
	{ name: 'Document Deleted', value: 'document.deleted' },
	{
		name: 'Form Submitted',
		value: 'form.submitted',
		description: 'Carries the personal data the respondent typed',
	},
	{
		name: 'Milestone Created',
		value: 'milestone.created',
		description: 'A milestone was added to the timeline',
	},
	{
		name: 'Portal Comment',
		value: 'portal.comment',
		description: 'The client commented in the portal',
	},
	{
		name: 'Report Approved',
		value: 'report.approved',
		description: 'The client approved the report',
	},
	{
		name: 'Report Changes Requested',
		value: 'report.changes_requested',
		description: 'The client asked for changes in the report',
	},
	{ name: 'Report Published', value: 'report.published' },
	{ name: 'Report Released to Portal', value: 'report.released' },
	{ name: 'Report Viewed', value: 'report.viewed', description: 'The client opened the report' },
	{
		name: 'Signal Created',
		value: 'signal.created',
		description: 'A new signal from the proactive engine or the weekly summary',
	},
	{
		name: 'Sync Completed',
		value: 'sync.completed',
		description: 'The daily data sync of an account finished',
	},
	{ name: 'Sync Failed', value: 'sync.failed' },
	{ name: 'Task Comment Created', value: 'task.commented' },
	{ name: 'Task Completed', value: 'task.completed' },
	{ name: 'Task Created', value: 'task.created' },
	{ name: 'Task Deleted', value: 'task.deleted' },
	{ name: 'Task Stage Changed', value: 'task.status_changed' },
	{ name: 'Task Updated', value: 'task.updated' },
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

export class BlocosTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blocos Marketing Trigger',
		name: 'blocosTrigger',
		icon: { light: 'file:../../icons/blocos.svg', dark: 'file:../../icons/blocos.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when events happen in Blocos',
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
					'The API key needs write access and a role with the "Manage API, webhooks and connected apps" permission: activating the workflow registers a webhook in Blocos, and deactivating it removes the webhook',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The events to listen to',
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
						'Blocos can only deliver events to a public address',
						{
							description:
								'This n8n instance is reachable only on this machine. Set the N8N_WEBHOOK_URL environment variable of n8n (WEBHOOK_URL before n8n 2.x) to its public address and activate the workflow again.',
						},
					);
				}

				const workflowName = this.getWorkflow().name ?? 'workflow';
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
							? `Blocos did not register the webhook: ${reason}`
							: 'Blocos did not register the webhook',
						description:
							'Check that the API key has write access, that its role has the "Manage API, webhooks and connected apps" permission, and that the n8n webhook address is public.',
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
							this.logger.warn('Blocos did not remove the webhook', { httpCode, message });
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
			response.status(401).send('Invalid signature').end();
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData() as IDataObject)],
		};
	}
}
