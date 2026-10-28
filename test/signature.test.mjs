import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import signature from '../dist/nodes/BlocosTrigger/signature.js';

const { isValidSignature, SIGNATURE_TOLERANCE_SECONDS } = signature;

// Same signing as Blocos (lib/platform/webhooks.ts, signWebhook): HMAC-SHA256 of "<timestamp>.<body>".
const secret = 'whsec_test';
const now = 1_790_000_000;
const body = JSON.stringify({
	id: 'd1',
	event: 'task.created',
	data: { title: 'Revisão de criativos' },
});
const sign = (ts, text = body, key = secret) =>
	`sha256=${createHmac('sha256', key).update(`${ts}.${text}`).digest('hex')}`;
const delivery = (overrides = {}) => ({
	secret,
	rawBody: Buffer.from(body),
	signature: sign(now),
	timestamp: String(now),
	nowSeconds: now,
	...overrides,
});

describe('isValidSignature', () => {
	describe('valid', () => {
		it('aceita a entrega assinada como a plataforma assina, com acento no corpo', () => {
			assert.equal(isValidSignature(delivery()), true);
		});

		it('aceita o vetor fixo que a Blocos produz (tests/n8nNodePackage.test.ts no app)', () => {
			const vector = '{"id":"d1","event":"task.created"}';
			assert.equal(
				isValidSignature({
					secret: 'whsec_test',
					rawBody: Buffer.from(vector),
					signature: 'sha256=c783b12c63d7e5c12ef51a0cd50a941eed43052fbdf407a343d90acd8e64f9a2',
					timestamp: '1790000000',
					nowSeconds: 1790000000,
				}),
				true,
			);
		});

		it('aceita relógio adiantado ou atrasado dentro da tolerância', () => {
			assert.equal(
				isValidSignature(delivery({ nowSeconds: now + SIGNATURE_TOLERANCE_SECONDS })),
				true,
			);
			assert.equal(
				isValidSignature(delivery({ nowSeconds: now - SIGNATURE_TOLERANCE_SECONDS })),
				true,
			);
		});
	});

	describe('attack', () => {
		it('rejeita corpo alterado depois da assinatura', () => {
			assert.equal(
				isValidSignature(
					delivery({ rawBody: Buffer.from(body.replace('task.created', 'task.deleted')) }),
				),
				false,
			);
		});

		it('rejeita assinatura feita com outro segredo', () => {
			assert.equal(
				isValidSignature(delivery({ signature: sign(now, body, 'whsec_other') })),
				false,
			);
		});

		it('rejeita timestamp trocado sem assinar de novo', () => {
			assert.equal(
				isValidSignature(delivery({ timestamp: String(now + 1), nowSeconds: now + 1 })),
				false,
			);
		});

		it('rejeita reenvio fora da janela de tolerância', () => {
			assert.equal(
				isValidSignature(delivery({ nowSeconds: now + SIGNATURE_TOLERANCE_SECONDS + 1 })),
				false,
			);
		});
	});

	describe('invalid', () => {
		it('rejeita sem segredo guardado, sem corpo cru ou sem cabeçalhos', () => {
			assert.equal(isValidSignature(delivery({ secret: undefined })), false);
			assert.equal(isValidSignature(delivery({ rawBody: undefined })), false);
			assert.equal(isValidSignature(delivery({ signature: undefined })), false);
			assert.equal(isValidSignature(delivery({ timestamp: undefined })), false);
		});

		it('rejeita assinatura sem o prefixo sha256= ou com tamanho errado', () => {
			assert.equal(
				isValidSignature(delivery({ signature: sign(now).slice('sha256='.length) })),
				false,
			);
			assert.equal(isValidSignature(delivery({ signature: 'sha256=abc' })), false);
		});

		it('rejeita timestamp que não é número inteiro', () => {
			assert.equal(isValidSignature(delivery({ timestamp: `${now}.5` })), false);
			assert.equal(isValidSignature(delivery({ timestamp: 'abc' })), false);
		});
	});
});
