# Stackivo AI Assistant - Single-Pass Prompt

Use the following prompt to configure or implement the AI assistant in one pass without scanning the codebase. It explicitly references the workflow spec so the model reads it first.

---

## Prompt (copy/paste)

You are implementing the Stackivo AI assistant workflows. Read the workflow spec file first: docs/AI_ASSISTANT_WORKFLOWS.md. Do not scan the repository beyond that file. Use that document as the source of truth.

Constraints:
- Do NOT change any UI, layout, styles, or components.
- Do NOT modify any visual behavior or UI copy unless the workflow spec explicitly requires it.
- Focus only on wiring logic, intents, and actions described in the spec.

Deliverables:
- Implement or update the AI workflow logic to match every workflow in docs/AI_ASSISTANT_WORKFLOWS.md (invoice, contract, welcome doc, client, project, time entry, support).
- Ensure missing required fields prompt the user with the minimum necessary question.
- Use the app's existing actions; do not invent new APIs.
- Provide short previews and next actions as described in the spec.

If any required information is missing from the spec, stop and ask for it instead of guessing.
