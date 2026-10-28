# n8n-nodes-blocos

Este é um pacote de nós da comunidade do n8n. Com ele você usa a [Blocos Marketing](https://blocosmarketing.com) nos seus fluxos do n8n.

A Blocos Marketing é uma plataforma para agências de marketing: reúne os dados de mídia e de análise de cada negócio dos clientes (Meta Ads, Google Ads, Google Analytics, Search Console e mais), conduz planos de ação aprovados pelo cliente e publica relatórios num portal do cliente.

O [n8n](https://n8n.io/) é uma plataforma de automação de fluxos com [licença fair-code](https://docs.n8n.io/sustainable-use-license/).

[Instalação](#instalação) ·
[Operações](#operações) ·
[Gatilho](#gatilho) ·
[Credenciais](#credenciais) ·
[Compatibilidade](#compatibilidade) ·
[Uso](#uso) ·
[Recursos](#recursos)

## Instalação

No n8n, abra **Settings › Community Nodes › Install** (só o dono e os administradores veem essa tela), digite `n8n-nodes-blocos`, marque a caixa que aceita os riscos de código de fonte pública e clique em **Install**. O passo a passo oficial está no [guia de instalação](https://docs.n8n.io/integrations/community-nodes/installation/) do n8n.

**Este pacote é para o n8n próprio (self-hosted).** A interface está em português, e o n8n Cloud só instala nós verificados pelo n8n, o que exige interface em inglês. Se você usa o n8n Cloud, avise a Blocos: o pacote em inglês sai quando houver quem precise dele.

A interface do próprio n8n continua em inglês ("Execute step", "Credentials"…): só o conteúdo dos nós da Blocos está em português.

## Operações

O nó **Blocos Marketing** usa a API REST da Blocos (`/api/v1`). Toda operação roda com as permissões da chave de API.

| Recurso | Operações |
|---|---|
| Cliente | Atualizar, Criar, Excluir, Obter, Obter vários |
| Métrica | Consultar, Obter retrato completo, Obter série diária, Obter vários (catálogo de métricas), Obter visão geral |
| Negócio | Atualizar, Criar, Excluir, Obter, Obter vários |
| Plano de ação | Criar, Enviar ao cliente, Obter, Obter vários, Registrar resultado |
| Relatório | Criar, Liberar no portal, Obter, Obter vários, Publicar versão |
| Tarefa | Adicionar itens ao checklist, Atualizar, Criar, Criar comentário, Excluir, Obter, Obter vários |

Os nomes são os da interface da Blocos: **negócio** é a empresa que paga pela mídia, e **tarefa** é a tarefa de Planejamentos.

Observações:

- As operações **Obter vários** têm **Retornar todos**: a Blocos entrega os resultados de 100 em 100.
- **Métrica › Consultar**, **Obter visão geral** e **Obter retrato completo** calculam as razões (CPA, CTR, ROAS) sobre as somas, como o painel faz, e comparam com o período anterior. Contas em moedas diferentes nunca são somadas.
- **Tarefa › Atualizar** movendo um plano de ação aprovado para a etapa de concluído registra o resultado do plano, como na interface da Blocos.
- As etapas e as prioridades das tarefas, e a lista de métricas, vêm da sua agência, inclusive as personalizadas.

## Gatilho

O nó **Blocos Marketing Trigger** inicia um fluxo quando algo acontece na Blocos: uma tarefa é criada ou concluída, um cliente aprova um plano de ação ou abre um relatório, um formulário é respondido, a sincronização diária termina, uma conexão cai e mais. Escolha **Todos os eventos** para receber também os eventos que a Blocos criar depois. Os nomes dos eventos são os mesmos de Desenvolvedores › Webhooks na Blocos.

- Ativar o fluxo registra um webhook na Blocos (Configurações › Desenvolvedores › Webhooks); desativar remove o webhook.
- Toda entrega é assinada. O gatilho confere o cabeçalho `X-Webhook-Signature` (HMAC-SHA256 de `<timestamp>.<corpo>` com o segredo do webhook) e recusa entregas com mais de cinco minutos. A requisição que não passa na conferência recebe `401` e nunca inicia o fluxo.
- A Blocos só entrega em endereços **públicos**. Se o n8n roda no seu computador, exponha-o e defina a variável de ambiente `N8N_WEBHOOK_URL` do n8n (`WEBHOOK_URL` antes do n8n 2.x) com o endereço público.
- A Blocos tenta de novo as entregas que falham e desliga o webhook depois de 50 falhas seguidas. Para voltar a receber eventos, desative e ative o fluxo: o gatilho remove o webhook antigo e registra um novo. Desligar o webhook na Blocos interrompe as entregas, mas ativar o fluxo de novo liga o webhook outra vez; para parar de vez, desative o fluxo no n8n.

Cada entrega vira um item:

```json
{
  "id": "id da entrega",
  "event": "task.completed",
  "agency_id": "…",
  "occurred_at": "2026-10-28T13:05:00.000Z",
  "data": { "id": "…", "title": "Revisar os criativos da campanha", "status": "concluido" }
}
```

`data` é o registro que mudou. **Formulário respondido** traz os dados pessoais que a pessoa digitou (nome, e-mail, respostas).

## Credenciais

Você precisa de uma chave de API da Blocos.

1. Na Blocos, abra **Configurações › Desenvolvedores › Chaves de API**.
2. Crie uma chave. Escolha acesso de **escrita** se o fluxo cria ou altera alguma coisa; uma chave só de leitura usa apenas as operações de leitura.
3. Copie a chave (ela começa com `ak_`). A Blocos mostra a chave uma única vez.
4. No n8n, crie uma credencial **Blocos Marketing API** e cole a chave. Mantenha a **URL base** padrão (`https://app.blocosmarketing.com`).

A chave age com o cargo de quem a criou: uma operação que o cargo não pode fazer falha com `403`. O gatilho precisa de uma chave de escrita cujo cargo tenha a permissão **Gerenciar API, webhooks e apps conectados (MCP)**. Se essa pessoa sair da agência, a chave deixa de funcionar.

Crie a chave com alguém que enxergue a agência inteira. A chave feita por um membro com a carteira de clientes recortada é recusada com `403 portfolio_restricted`, e um webhook criado antes da restrição é desligado.

## Compatibilidade

Testado com o n8n 2.45.5.

## Uso

**Enviar cada novo formulário para o chat da equipe.** Blocos Marketing Trigger (evento: Formulário respondido) → Slack.

**Criar uma tarefa quando o cliente pedir ajustes num relatório.** Blocos Marketing Trigger (evento: Cliente pediu ajustes no relatório) → Blocos Marketing (Tarefa › Criar). O evento traz o relatório em `{{ $json.data.subject_id }}`, o título dele em `{{ $json.data.payload.title }}`, o comentário do cliente em `{{ $json.data.payload.comment }}` e o negócio em `{{ $json.data.business_id }}`.

**Números da semana numa planilha.** Schedule Trigger → Blocos Marketing (Métrica › Consultar, período Últimos 7 dias) → Google Sheets.

**Perguntar a um agente de IA sobre um cliente.** O nó Blocos Marketing pode ser usado como ferramenta pelo AI Agent do n8n: dê a ele Métrica › Obter retrato completo para o agente ler todas as fontes de um negócio.

Os erros da Blocos chegam com um código e uma mensagem, por exemplo `422` quando uma etapa de tarefa não existe na agência. Ligue a configuração **On Error › Continue** do nó para o fluxo seguir e você tratar o item de erro.

## Recursos

- [Documentação dos nós da comunidade do n8n](https://docs.n8n.io/integrations/#community-nodes)
- [Blocos Marketing](https://blocosmarketing.com)
- Referência da API da Blocos: `https://app.blocosmarketing.com/api/v1/openapi.json`
