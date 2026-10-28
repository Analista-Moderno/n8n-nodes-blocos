import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import triggerModule from '../dist/nodes/BlocosTrigger/BlocosTrigger.node.js';

const trigger = new triggerModule.BlocosTrigger();
const { checkExists, create, delete: remove } = trigger.webhookMethods.default;
const URL_N8N = 'https://n8n.example.com/webhook/abc/webhook';

/** IHookFunctions with only what the trigger uses; records every request it makes. */
function hookContext({
	staticData = {},
	webhooks = [],
	events = ['task.created'],
	url = URL_N8N,
	failures = {},
} = {}) {
	const requests = [];
	const warnings = [];
	return {
		requests,
		warnings,
		staticData,
		getWorkflowStaticData: () => staticData,
		getNodeWebhookUrl: () => url,
		getNodeParameter: (name) => (name === 'events' ? events : undefined),
		getWorkflow: () => ({ name: 'Leads do formulário', active: true }),
		getNode: () => ({
			id: 'n1',
			name: 'Blocos Marketing Trigger',
			type: 'blocosTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getCredentials: async () => ({ apiKey: 'ak_x', baseUrl: 'https://app.blocosmarketing.com/' }),
		logger: { warn: (message, meta) => warnings.push({ message, meta }) },
		helpers: {
			httpRequestWithAuthentication: async (_type, options) => {
				const path = new URL(options.url).pathname;
				requests.push({ method: options.method, path, body: options.body });
				const failure = failures[`${options.method} ${path}`];
				if (failure) throw failure;
				if (options.method === 'GET') return { data: webhooks };
				if (options.method === 'POST')
					return { id: 'wh-new', secret: 'whsec_new', url: options.body.url, is_active: true };
				return { id: 'wh-1' };
			},
		},
	};
}

describe('checkExists', () => {
	it('devolve false sem chamar a API quando o nó ainda não registrou webhook', async () => {
		const ctx = hookContext();
		assert.equal(await checkExists.call(ctx), false);
		assert.deepEqual(ctx.requests, []);
	});

	it('devolve true só com a leitura quando o webhook está ligado no mesmo endereço', async () => {
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			webhooks: [{ id: 'wh-1', url: URL_N8N, is_active: true }],
		});
		assert.equal(await checkExists.call(ctx), true);
		assert.deepEqual(
			ctx.requests.map((r) => `${r.method} ${r.path}`),
			['GET /api/v1/webhooks'],
		);
	});

	it('religa o webhook desligado pela Blocos sem trocar id nem segredo', async () => {
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			webhooks: [{ id: 'wh-1', url: URL_N8N, is_active: false }],
			events: ['*', 'task.created'],
		});
		assert.equal(await checkExists.call(ctx), true);
		assert.deepEqual(ctx.requests[1], {
			method: 'PATCH',
			path: '/api/v1/webhooks/wh-1',
			body: { url: URL_N8N, events: ['*'], is_active: true },
		});
		assert.deepEqual(ctx.staticData, { webhookId: 'wh-1', webhookSecret: 's' });
	});

	it('aponta o webhook para o endereço novo quando o n8n mudou de URL', async () => {
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			webhooks: [
				{ id: 'wh-1', url: 'https://old.example.com/webhook/abc/webhook', is_active: true },
			],
		});
		assert.equal(await checkExists.call(ctx), true);
		assert.equal(ctx.requests[1].body.url, URL_N8N);
	});

	it('esquece o webhook apagado na Blocos e devolve false para o n8n registrar outro', async () => {
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			webhooks: [{ id: 'other', url: URL_N8N, is_active: true }],
		});
		assert.equal(await checkExists.call(ctx), false);
		assert.deepEqual(ctx.staticData, {});
	});
});

describe('create', () => {
	for (const url of [
		'http://localhost:5678/webhook/a/webhook',
		'http://127.0.0.5:5678/webhook/a/webhook',
		'http://[::1]:5678/webhook/a/webhook',
	]) {
		it(`recusa endereço desta máquina antes de chamar a API (${new URL(url).hostname})`, async () => {
			const ctx = hookContext({ url });
			await assert.rejects(() => create.call(ctx), /endereço público/);
			assert.deepEqual(ctx.requests, []);
		});
	}

	it('registra com "All Events" como ["*"], nome do fluxo na descrição, e guarda id e segredo', async () => {
		const ctx = hookContext({ events: ['task.created', '*'] });
		assert.equal(await create.call(ctx), true);
		assert.deepEqual(ctx.requests[0], {
			method: 'POST',
			path: '/api/v1/webhooks',
			body: { url: URL_N8N, events: ['*'], description: 'n8n: Leads do formulário' },
		});
		assert.deepEqual(ctx.staticData, { webhookId: 'wh-new', webhookSecret: 'whsec_new' });
	});

	it('mantém o motivo da Blocos e explica permissão e endereço quando ela recusa o registro', async () => {
		const reason =
			'Seu cargo não tem a permissão "Gerenciar API, webhooks e apps conectados (MCP)".';
		const ctx = hookContext({
			failures: {
				'POST /api/v1/webhooks': { message: 'Forbidden', httpCode: '403', description: reason },
			},
		});
		await assert.rejects(
			() => create.call(ctx),
			(error) =>
				error.message === `A Blocos não registrou o webhook: ${reason}` &&
				/Gerenciar API, webhooks/.test(error.description),
		);
	});
});

describe('delete', () => {
	it('trata 404 como já removido: limpa os dados e devolve true', async () => {
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			failures: { 'DELETE /api/v1/webhooks/wh-1': { httpCode: '404' } },
		});
		assert.equal(await remove.call(ctx), true);
		assert.deepEqual(ctx.staticData, {});
	});

	it('mantém os dados e avisa no log, sem a requisição, quando a remoção falha por outro motivo', async () => {
		const failure = {
			httpCode: '500',
			message: 'The service was not able to process your request',
			config: { headers: { Authorization: 'Bearer ak_secret' } },
		};
		const ctx = hookContext({
			staticData: { webhookId: 'wh-1', webhookSecret: 's' },
			failures: { 'DELETE /api/v1/webhooks/wh-1': failure },
		});
		assert.equal(await remove.call(ctx), false);
		assert.deepEqual(ctx.staticData, { webhookId: 'wh-1', webhookSecret: 's' });
		assert.equal(ctx.warnings.length, 1);
		assert.doesNotMatch(JSON.stringify(ctx.warnings), /ak_secret/);
	});
});

describe('webhook', () => {
	const secret = 'whsec_test';
	const body = { id: 'd1', event: 'task.created', data: { title: 'Revisão' } };
	const raw = JSON.stringify(body);
	function webhookContext(signatureFor) {
		const now = Math.floor(Date.now() / 1000);
		const response = {
			code: null,
			text: null,
			status(code) {
				this.code = code;
				return this;
			},
			send(text) {
				this.text = text;
				return this;
			},
			end() {
				return this;
			},
		};
		return {
			response,
			getRequestObject: () => ({ rawBody: Buffer.from(raw) }),
			getHeaderData: () => ({
				'x-webhook-timestamp': String(now),
				'x-webhook-signature': `sha256=${createHmac('sha256', signatureFor).update(`${now}.${raw}`).digest('hex')}`,
			}),
			getWorkflowStaticData: () => ({ webhookId: 'wh-1', webhookSecret: secret }),
			getResponseObject: () => response,
			getBodyData: () => body,
			helpers: { returnJsonArray: (data) => [{ json: data }] },
		};
	}

	it('inicia o fluxo com o corpo da entrega quando a assinatura confere', async () => {
		const ctx = webhookContext(secret);
		assert.deepEqual(await trigger.webhook.call(ctx), { workflowData: [[{ json: body }]] });
		assert.equal(ctx.response.code, null);
	});

	it('responde 401 e não inicia o fluxo quando a assinatura não confere', async () => {
		const ctx = webhookContext('whsec_other');
		assert.deepEqual(await trigger.webhook.call(ctx), { noWebhookResponse: true });
		assert.equal(ctx.response.code, 401);
	});
});
