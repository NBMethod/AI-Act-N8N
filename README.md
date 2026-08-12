# n8n-nodes-aiact

Check AI workflows against the EU AI Act and record auditable evidence, without
leaving n8n.

This is an [n8n](https://n8n.io) community node. It talks to the AI Act
Compliance API, which classifies a declared AI system, returns the obligations
that apply to it today, and appends a tamper-evident evidence record for every
check.

[Installation](#installation) · [Operations](#operations) ·
[Credentials](#credentials) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the
[community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
and install `n8n-nodes-aiact`.

## Operations

**Compliance Check**

- **Run Check** — evaluate a declared system and append an evidence record.
  Returns the decision (`allow`, `warn`, `review`, `block`), the risk level, the
  obligations that apply today, the missing controls, and the evidence ID.

**System**

- **Create** — declare a system once: role, EU scope, what it does, who it
  affects.
- **Get**, **Get Many**, **Update** — read and maintain the register, including
  the controls you have implemented and the strict mode setting.

**Evidence**

- **Get Many** — retrieve the evidence chain of a system together with its
  integrity verification.
- **Get** — retrieve a single record.

## Credentials

Create an API key in the AI Act Compliance dashboard, under Settings then API
keys. The key is shown once.

The node also accepts a custom **Base URL** for self-hosted or regional
instances. Leave the default otherwise.

## Usage

### 1. Declare the system once

Use **System → Create**, or the dashboard. A minimal declaration for a support
chatbot:

```json
{
  "role": "provider",
  "eu_nexus": true,
  "interacts_with_humans": true,
  "generates_content": true
}
```

You get a system ID such as `sys_8f2a`. The rule pack version is pinned at this
point, so a decision taken today stays reproducible after the law changes.

### 2. Check on every run

Put **Compliance Check → Run Check** before your LLM or agent node, select the
system, and branch on `decision` with an IF node. `example-workflow.json` in this
package is a ready-made version of that pattern.

A typical response:

```json
{
  "decision": "warn",
  "risk_level": "transparency",
  "obligations": [
    { "id": "ART_50_1_DISCLOSURE", "article": "Article 50(1)" }
  ],
  "controls_missing": ["disclose_ai_interaction"],
  "would_block_in_strict": ["disclose_ai_interaction"],
  "evidence_id": "evt_m2k9x1c"
}
```

### 3. Move to strict mode when you are ready

Set **Strict Mode** to `dry_run` first. Nothing is blocked, but
`would_block_in_strict` tells you exactly what would stop once you switch it on.
Close those gaps, then set it to `on`.

Note that only runtime controls can block a call. Organisational controls, such
as AI literacy training, are reported as missing but never stop a workflow: no
node can implement a training programme.

### Enabling **Fail on Block**

By default a blocked decision flows through as data, so you can branch on it.
Turn on **Fail on Block** if you would rather have the node raise an error and
route the item to the error output.

## Data sent

The node sends the system ID and optional metadata: model name, purpose, actor.
Prompts, responses and message content are never transmitted.

## Compatibility

Tested with n8n 1.60 and later. Requires Node.js 20.15 or later.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [AI Act Compliance API documentation](https://docs.aiact.dev)
- [EU AI Act, Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)

## Disclaimer

This node reports the obligations identified for a declared system and the
controls applied to it. It does not constitute legal advice and does not
guarantee compliance.

## Licence

[MIT](LICENSE.md)
