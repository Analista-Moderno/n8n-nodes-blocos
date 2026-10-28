import { createHmac, timingSafeEqual } from 'crypto';

/** Deliveries older (or newer) than this are refused: a captured request cannot be replayed later. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Checks a Blocos webhook delivery. Blocos signs every attempt (retries included) with
 * `X-Webhook-Signature: sha256=HMAC_SHA256(secret, "<timestamp>.<raw body>")` and sends
 * the timestamp, in seconds, in `X-Webhook-Timestamp`.
 */
export function isValidSignature(input: {
	secret: string | undefined;
	rawBody: Buffer | undefined;
	signature: string | undefined;
	timestamp: string | undefined;
	nowSeconds: number;
}): boolean {
	const { secret, rawBody, signature, timestamp, nowSeconds } = input;
	if (!secret || !rawBody || !signature?.startsWith('sha256=') || !timestamp) return false;
	if (!/^\d+$/.test(timestamp)) return false;
	if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;

	const expected = createHmac('sha256', secret)
		.update(`${timestamp}.`)
		.update(rawBody)
		.digest('hex');
	const received = signature.slice('sha256='.length);
	if (received.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
