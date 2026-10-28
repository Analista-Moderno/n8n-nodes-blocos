import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { blocosApiRequest } from './shared/transport';

const SEARCH_PAGE_SIZE = 100;

type Page<T> = { data: T[]; pagination: { has_more: boolean } };

async function searchByName(
	context: ILoadOptionsFunctions,
	path: string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const offset = paginationToken ? Number(paginationToken) : 0;
	const page = await blocosApiRequest<Page<{ id: string; name: string }>>(context, 'GET', path, {
		qs: { limit: SEARCH_PAGE_SIZE, offset, ...(filter ? { q: filter } : {}) },
	});
	return {
		results: page.data.map((item) => ({ name: item.name, value: item.id })),
		paginationToken: page.pagination.has_more ? String(offset + page.data.length) : undefined,
	};
}

export const listSearch = {
	async getBusinesses(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return searchByName(this, '/businesses', filter, paginationToken);
	},

	async getClients(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return searchByName(this, '/clients', filter, paginationToken);
	},
};

type TaskConfig = {
	statuses: Array<{ key: string; label: string }>;
	priorities: Array<{ key: string; label: string }>;
};

export const loadOptions = {
	// Stages and priorities are configurable per agency: the keys come from the API, never a fixed list.
	async getTaskStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const config = await blocosApiRequest<TaskConfig>(this, 'GET', '/tasks/config');
		return config.statuses.map((status) => ({ name: status.label, value: status.key }));
	},

	async getTaskPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const config = await blocosApiRequest<TaskConfig>(this, 'GET', '/tasks/config');
		return config.priorities.map((priority) => ({ name: priority.label, value: priority.key }));
	},

	async getMetrics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const catalog = await blocosApiRequest<{
			data: Array<{ id: string; label: string; what: string }>;
		}>(this, 'GET', '/metrics');
		return catalog.data.map((metric) => ({
			name: metric.label,
			value: metric.id,
			description: metric.what,
		}));
	},
};
