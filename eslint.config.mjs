import { config } from '@n8n/node-cli/eslint';

// A interface do pacote é em português do Brasil (decisão de 28/10/2026: todos os clientes rodam
// n8n próprio, e o selo de verificado do n8n, que exige inglês, só vale para o n8n Cloud). Estas
// regras do n8n não medem estrutura: elas só impõem a redação em inglês (caixa de título inglesa,
// "Get Many", "Update Fields", "Whether to…", o texto fixo das listas dinâmicas). Todas as outras
// continuam ligadas. Uma versão em inglês para o Cloud volta a ligar tudo.
const englishWordingRules = [
	'node-param-display-name-miscased',
	'node-param-operation-option-action-miscased',
	'node-param-description-boolean-without-whether',
	'node-param-option-name-wrong-for-get-many',
	'node-param-display-name-wrong-for-update-fields',
	'node-param-display-name-wrong-for-dynamic-options',
	'node-param-description-wrong-for-dynamic-options',
	'node-param-description-wrong-for-dynamic-multi-options',
	'node-param-description-wrong-for-return-all',
	'node-param-description-wrong-for-limit',
];

export default [
	...config,
	{
		files: ['./nodes/**/*.ts'],
		rules: Object.fromEntries(englishWordingRules.map((rule) => [`n8n-nodes-base/${rule}`, 'off'])),
	},
];
