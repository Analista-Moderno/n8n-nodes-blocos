import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import blocosModule from '../dist/nodes/Blocos/Blocos.node.js';
import triggerModule from '../dist/nodes/BlocosTrigger/BlocosTrigger.node.js';

// The ESM build of n8n-workflow uses extensionless imports that plain Node can't resolve.
const { Workflow } = createRequire(import.meta.url)('n8n-workflow');

const types = {
	blocos: new blocosModule.Blocos(),
	blocosTrigger: new triggerModule.BlocosTrigger(),
};
const nodeTypes = {
	getByName: (name) => types[name],
	getByNameAndVersion: (name) => types[name],
	getKnownTypes: () => ({}),
};

/** The canvas subtitle, evaluated by n8n's own expression engine. */
function subtitle(type, parameters) {
	const node = { id: '1', name: 'N', type, typeVersion: 1, position: [0, 0], parameters };
	const workflow = new Workflow({ nodes: [node], connections: {}, active: false, nodeTypes });
	return workflow.expression.getSimpleParameterValue(
		node,
		types[type].description.subtitle,
		'manual',
		{},
	);
}

describe('subtítulo no canvas', () => {
	it('mostra a ação de cada operação, não "getAll: business"', () => {
		const operations = types.blocos.description.properties.filter((p) => p.name === 'operation');
		for (const property of operations) {
			const resource = property.displayOptions.show.resource[0];
			for (const option of property.options) {
				assert.equal(subtitle('blocos', { resource, operation: option.value }), option.action);
			}
		}
	});

	it('mostra os nomes dos eventos do gatilho', () => {
		assert.equal(
			subtitle('blocosTrigger', { events: ['task.completed', 'report.viewed'] }),
			'Tarefa concluída, Cliente abriu o relatório',
		);
		assert.equal(subtitle('blocosTrigger', { events: ['*'] }), 'Todos os eventos');
		assert.equal(subtitle('blocosTrigger', { events: ['evento.novo'] }), 'evento.novo');
	});
});

describe('eventos do gatilho no painel de nós', () => {
	// The n8n editor lists a trigger's events only for these labels (actions parser, n8n 2.45).
	it('o campo tem um rótulo que o editor reconhece', () => {
		const field = types.blocosTrigger.description.properties.find((p) => p.name === 'events');
		assert.ok(['event', 'events', 'trigger on'].includes(field.displayName.toLowerCase()));
	});

	it('todo evento tem o texto da ação em português', () => {
		const field = types.blocosTrigger.description.properties.find((p) => p.name === 'events');
		for (const option of field.options) assert.match(option.action, /^Quando /, option.value);
	});
});
