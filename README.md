# n8n-nodes-aiact

Check AI workflows against the EU AI Act and record auditable evidence, without
leaving n8n.

This is an [n8n](https://n8n.io) community node for
[VerifactAI](https://verifactai.app). The VerifactAI API classifies a declared AI
system, returns the obligations that apply to it today, and appends a
tamper-evident evidence record for every check.

[Installation](#installation) · [Operations](#operations) ·
[Credentials](#credentials) · [Usage](#usage) · [Video walkthrough](#video-walkthrough) ·
[Resources](#resources)

## Video walkthrough

**[▶ Watch the node in action on YouTube](https://www.youtube.com/watch?v=ibeeEu8h-2E)**
— installing the node, creating the credential, declaring a system and
running a compliance check before an AI call.

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
  the controls you have implemented, their attestations, the strict mode
  setting, and the rule pack version the system is pinned to.

**Evidence**

- **Get Many** — retrieve the evidence chain of a system together with its
  integrity verification.
- **Get** — retrieve a single record.

## Credentials

Create an account on [VerifactAI](https://verifactai.app). Your API key is
emailed to you as soon as the account is created. It is shown only once: store it
in your password manager.

In n8n, create a **VerifactAI API** credential and paste the key. Leave
**Base URL** on its default, `https://api.verifactai.app`, unless you run a
self-hosted or regional instance.

## Usage

### 1. Declare the system once

Use **System → Create**, or the VerifactAI register. A minimal declaration for a support
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

### 4. High-risk systems: attest your controls

A system in an Annex III area (recruitment, credit scoring, education,
biometrics, essential services…) carries the provider or deployer obligations
of Articles 8 to 27, applicable from 2 December 2027. The rule pack lists them
article by article, with one control each.

Ticking a control says it is in place. **Control Attestations** say who vouches
for it, on which document, and until when:

```json
{
  "quality_management_system": {
    "owner": "Head of Quality",
    "document_ref": "QMS-001 v3",
    "verified_at": "2027-11-15",
    "verified_by": "Internal audit",
    "valid_until": "2028-11-15",
    "standard_id": "en_18286_2026",
    "clause": "7.2"
  }
}
```

Past `valid_until`, the control counts as missing again and the dossier says
why. `standard_id` refers to a recognised standard listed by
`GET /v1/packs/:ref/schema` — today EN 18286:2026 (harmonised standard for the
Article 17 quality management system, presumption of conformity limited to
that requirement) and the Code of Practice on marking and labelling
AI-generated content (voluntary). An attestation documents how a control was
implemented; it never certifies the system.

### Enabling **Fail on Block**

By default a blocked decision flows through as data, so you can branch on it.
Turn on **Fail on Block** if you would rather have the node raise an error and
route the item to the error output.

## Data sent

The node sends the system ID and optional metadata: model name, purpose, actor.
Prompts, responses and message content are never transmitted.

## Rule pack versions

Each system is pinned to the version of the rules it was declared with, so a
decision taken in March is reproducible with the law of March. When a new
version is published (for example after the Digital Omnibus or a new
harmonised standard), move a system to it with **System → Update → Rule Pack
Version**. The declaration is re-validated against the new version; evidence
already recorded keeps the version it was produced with.

## Compatibility

Tested with n8n 1.60 and later. Requires Node.js 20.15 or later.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [VerifactAI](https://verifactai.app)
- [Video walkthrough](https://www.youtube.com/watch?v=ibeeEu8h-2E)
- [Source code and issues](https://github.com/NBMethod/AI-Act-N8N)
- [EU AI Act, Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)

## Disclaimer

This node reports the obligations identified for a declared system and the
controls applied to it. It does not constitute legal advice and does not
guarantee compliance.

## Licence

[MIT](LICENSE.md)
