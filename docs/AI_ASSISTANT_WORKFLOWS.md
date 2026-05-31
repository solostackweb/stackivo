# Stackivo AI Assistant Workflows (Implementation Guide)

This document summarizes the major workflows the AI assistant must support and the input/output expectations for each. Use it as a prompt/spec when building or extending the AI agent.

## Scope
- The assistant is a workspace copilot, not a chatbot.
- It must operate inside the Stackivo UI and use existing app actions.
- Each workflow should be deterministic and grounded in real data.

---

## Global Behavior
- Always read the current workspace context (page, client, project, invoice, contract).
- Prefer creating drafts first, then ask for approval before sending.
- Provide clear next actions after each step (open, approve, send, edit).
- Handle missing context by asking for the minimum required fields.

---

## Workflow: Invoices

### Goal
Create and send a draft invoice based on a natural language prompt.

### Required Inputs
- Client (name or ID)
- Work description
- Amount (or quantity + unit price)
- Due date (optional, but preferred)
- Discount or tax (optional)

### Flow
1. Parse the prompt into invoice fields.
2. If client is missing, ask: "Which client is this invoice for?"
3. Create invoice draft using the app action.
4. Show a compact preview (client, total, due date, notes).
5. Offer actions:
   - Approve invoice
   - Open invoice
   - Send via email / WhatsApp / both

### Success Output
- Draft created and stored in invoices.
- Approval and delivery actions available.

---

## Workflow: Contracts

### Goal
Generate a contract/proposal draft with full sections and send for signature.

### Required Inputs
- Client
- Contract type (proposal, agreement, NDA, retainer, etc.)
- Scope and deliverables
- Commercial terms (fees, payment schedule)
- Timeline (optional)
- Clauses or exclusions (optional)

### Flow
1. Confirm client and project (if provided).
2. Gather scope and commercial details.
3. Create contract draft using the app action.
4. Show a preview summary of sections.
5. Offer actions:
   - Approve & email
   - Send via WhatsApp
   - Open editor

### Success Output
- Draft created in contracts.
- Ready to send for signature.

---

## Workflow: Welcome Documents

### Goal
Create a welcome/onboarding document draft for a client.

### Required Inputs
- Client (optional)
- Working style (communication, feedback, process)
- Payment terms
- Deliverables and timeline
- Tone (warm, premium, direct)

### Flow
1. Collect the onboarding details.
2. Create welcome document draft.
3. Show a preview summary.
4. Offer actions:
   - Approve & publish
   - Open editor
   - Deliver via email or WhatsApp

### Success Output
- Draft created in welcome documents.
- Delivery actions available.

---

## Workflow: Clients

### Goal
Create a client record from a short description.

### Required Inputs
- Client name
- Business name (optional)
- Email / phone (optional)
- Billing address (optional)
- Notes (optional)

### Flow
1. Ask for missing name if not provided.
2. Create client record.
3. Offer action to open clients list.

### Success Output
- Client stored in CRM.

---

## Workflow: Projects

### Goal
Create a project and link it to a client.

### Required Inputs
- Project name
- Client (optional)
- Scope / goal
- Status
- Timeline (optional)

### Flow
1. Ask for missing project name or scope if needed.
2. Create project record.
3. Offer action to open projects list.

### Success Output
- Project stored and optionally linked to client.

---

## Workflow: Time Entry

### Goal
Log a time entry against a project.

### Required Inputs
- Description
- Duration
- Billable vs non-billable
- Project (optional)

### Flow
1. Parse duration and billable intent.
2. Draft a time entry.
3. Offer action to open the time tracker.

### Success Output
- Draft time entry created.

---

## Workflow: Support

### Goal
Answer help questions or file a support request.

### Required Inputs
- User question
- Page/workflow context (optional)

### Flow
1. Try to answer from docs first.
2. If not possible, submit a support request.
3. Confirm that the request was sent.

### Success Output
- Support answer returned or ticket submitted.

---

## Suggested AI Prompt Pattern
Use this structure for all workflows:

- Identify intent (invoice, contract, welcome doc, client, project, time entry, support).
- Extract key fields from user input.
- Ask only for missing required fields.
- Call the relevant action.
- Present a short preview and next actions.

---

## Quick Action Labels
- Create invoice
- Draft contract
- Welcome doc
- Add client
- Add project
- Log time
- Support
