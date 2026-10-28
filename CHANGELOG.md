# Changelog

## 0.2.2

- O painel de nós do n8n lista os eventos do gatilho ("Quando uma tarefa for concluída"…): clicar num deles cria o gatilho com o evento já marcado. Para isso o campo de eventos passa a se chamar **Events**, o único nome (com **Event** e **Trigger On**) que o editor do n8n reconhece.
- O subtítulo dos nós no fluxo mostra a ação em português ("Obter vários negócios") e os nomes dos eventos, no lugar dos valores internos ("getAll: business", "task.completed").
- Nada muda para os fluxos que já usam o pacote.

## 0.2.1

- Publicação pelo Trusted Publisher do npm, sem token. Nada muda no pacote.

## 0.2.0

- Interface e documentação em português do Brasil: nomes dos nós, operações, campos, dicas, eventos do gatilho, mensagens de erro e README. Os nomes passam a ser os da Blocos (negócio, plano de ação, "Tarefa mudou de etapa"…).
- O pacote deixa de atender à verificação do n8n, que exige inglês, e por isso não é instalável no n8n Cloud. Uma versão em inglês sai quando houver quem precise dela.
- Nada muda para os fluxos que já usam o pacote: os identificadores internos de recursos, operações e eventos são os mesmos.

## 0.1.1

- Primeira versão publicada no npm. Acesso público declarado no pacote para o npm gerar a declaração de procedência (provenance).

## 0.1.0

- Nó Blocos Marketing: negócios, clientes, tarefas, planos de ação, relatórios e métricas.
- Blocos Marketing Trigger: inicia fluxos com os eventos da Blocos, com entregas assinadas.
- Credencial Blocos Marketing API (chave de API).
