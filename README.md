# n8n-nodes-blocos

This is an n8n community node package. It lets you use [Blocos Marketing](https://blocosmarketing.com) in your n8n workflows.

Blocos Marketing is a platform for marketing agencies: it gathers the media and analytics data of each client business (Meta Ads, Google Ads, Google Analytics, Search Console and more), runs action plans approved by the client, and publishes reports in a client portal.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) ·
[Operations](#operations) ·
[Trigger](#trigger) ·
[Credentials](#credentials) ·
[Compatibility](#compatibility) ·
[Usage](#usage) ·
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install the package `n8n-nodes-blocos`.

## Operations

The **Blocos Marketing** node works with the Blocos REST API (`/api/v1`). Every operation runs with the permissions of the API key.

| Resource | Operations |
|---|---|
| Action Plan | Create, Get, Get Many, Record Result, Send to Client |
| Business | Create, Delete, Get, Get Many, Update |
| Client | Create, Delete, Get, Get Many, Update |
| Metric | Get Daily Series, Get Many (metric catalog), Get Overview, Get Snapshot, Query |
| Report | Create, Get, Get Many, Publish Version, Release to Portal |
| Task | Add Checklist Items, Create, Create Comment, Delete, Get, Get Many, Update |

Terms, as they appear in the Blocos interface (Portuguese):

| In this node | In Blocos |
|---|---|
| Business | Negócio (the company that pays for the media) |
| Client | Cliente |
| Task | Tarefa (Planejamentos) |
| Action Plan | Plano de ação |
| Report | Relatório |
| Daily Lead Log | Diário de leads |

Notes:

- **Get Many** operations support **Return All**; Blocos pages results 100 at a time.
- **Metric > Query**, **Get Overview** and **Get Snapshot** calculate ratios (CPA, CTR, ROAS) over sums, as the dashboard does, and compare with the previous period. Accounts in different currencies are never added together.
- **Task > Update** moving an approved action plan to the done stage records the plan result, as in the Blocos interface.
- Task stages and priorities, and the metric list, are loaded from your agency, including custom ones.

## Trigger

The **Blocos Marketing Trigger** node starts a workflow when something happens in Blocos: a task is created or completed, a client approves an action plan or opens a report, a form is submitted, a daily sync finishes, a connection expires, and more. Choose **All Events** to also receive events that Blocos adds later.

- Activating the workflow registers a webhook in Blocos (Settings > Developers > Webhooks); deactivating it removes the webhook.
- Every delivery is signed. The trigger checks the `X-Webhook-Signature` header (HMAC-SHA256 of `<timestamp>.<body>` with the webhook secret) and refuses deliveries older than five minutes. Requests that fail the check get `401` and never start the workflow.
- Blocos only delivers to **public** addresses. If n8n runs on your own computer, expose it and set the n8n `N8N_WEBHOOK_URL` environment variable (`WEBHOOK_URL` before n8n 2.x) to the public address.
- Blocos retries failed deliveries and switches a webhook off after 50 failures in a row. To get events again, deactivate and activate the workflow: the trigger removes the old webhook and registers a new one. Switching the webhook off in Blocos stops deliveries, but activating the workflow again turns them back on; to stop for good, deactivate the workflow in n8n.

Each delivery becomes one item:

```json
{
  "id": "delivery id",
  "event": "task.completed",
  "agency_id": "…",
  "occurred_at": "2026-10-28T13:05:00.000Z",
  "data": { "id": "…", "title": "Review the campaign creatives", "status": "concluido" }
}
```

`data` is the record that changed. **Form Submitted** carries the personal data the respondent typed (name, email, answers).

## Credentials

You need an API key from Blocos.

1. In Blocos, open **Settings > Developers > API keys** (*Configurações › Desenvolvedores › Chaves de API*).
2. Create a key. Choose **write** access if the workflow creates or changes anything; a read-only key can only use the read operations.
3. Copy the key (it starts with `ak_`). Blocos shows it only once.
4. In n8n, create a **Blocos Marketing API** credential and paste the key. Keep the default **Base URL** (`https://app.blocosmarketing.com`).

The key acts with the role of the person who created it: an operation the role cannot do fails with `403`. The trigger needs a write key whose role has the **Manage API, webhooks and connected apps** permission (*Gerenciar API, webhooks e apps conectados (MCP)*). If that person leaves the agency, the key stops working.

Create the key with someone who sees the whole agency. A key made by a member whose client portfolio is restricted (*carteira recortada*) is refused with `403 portfolio_restricted`, and a webhook created before the restriction is switched off.

## Compatibility

Tested with n8n 2.45.5.

## Usage

**Send every new lead form to the team chat.** Blocos Marketing Trigger (event: Form Submitted) → Slack.

**Create a task when the client asks for changes in a report.** Blocos Marketing Trigger (event: Report Changes Requested) → Blocos Marketing (Task > Create). The event carries the report in `{{ $json.data.subject_id }}`, its title in `{{ $json.data.payload.title }}`, the client's comment in `{{ $json.data.payload.comment }}` and the business in `{{ $json.data.business_id }}`.

**Weekly numbers in a spreadsheet.** Schedule Trigger → Blocos Marketing (Metric > Query, period Last 7 Days) → Google Sheets.

**Ask an AI agent about a client.** The Blocos Marketing node can be used as a tool by the n8n AI Agent: give it Metric > Get Snapshot to let the agent read every source of a business.

Errors from Blocos come back with a code and a message, for example `422` when a task stage does not exist in the agency. Turn on the node setting **On Error > Continue** to keep the workflow running and handle the error item yourself.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Blocos Marketing](https://blocosmarketing.com)
- Blocos API reference: `https://app.blocosmarketing.com/api/v1/openapi.json`
