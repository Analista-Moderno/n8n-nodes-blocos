import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const CREDENTIAL_TYPE = 'blocosApi';

/** "https://app.blocosmarketing.com/" -> "https://app.blocosmarketing.com/api/v1" */
export function apiBaseUrl(baseUrl: string): string {
	return `${baseUrl.replace(/\/+$/, '')}/api/v1`;
}

/**
 * Calls the Blocos REST API (/api/v1) for the code paths that are not declarative:
 * list search, dynamic options and the trigger's webhook lifecycle.
 */
export async function blocosApiRequest<T>(
	context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	options: { qs?: IDataObject; body?: IDataObject } = {},
): Promise<T> {
	const { baseUrl } = await context.getCredentials<{ baseUrl: string }>(CREDENTIAL_TYPE);
	return (await context.helpers.httpRequestWithAuthentication.call(context, CREDENTIAL_TYPE, {
		method,
		url: `${apiBaseUrl(baseUrl)}${path}`,
		qs: options.qs,
		body: options.body,
		json: true,
	})) as T;
}
