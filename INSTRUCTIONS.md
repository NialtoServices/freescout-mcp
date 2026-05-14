# FreeScout MCP — Server Instructions

This MCP server wraps the FreeScout API and Webhooks module. The constraints below apply across the catalogue. Tool-specific details live in each tool's own description.

## Conversation states

Every conversation is in exactly one state. Understanding these is essential to interpreting user requests:

- **active** — The customer has replied (or sent an initial message) and the conversation is waiting for a user to reply. These are the ones that require action from a user.
- **pending** — The conversation is waiting for the customer to send a reply. These do not require action from the user.
- **closed** — The conversation is finished. A reply from the customer reopens it and moves it back to **active**.
- **spam** — Marked as spam by a user or the system. Behaves like **active** but is lower priority; should be deleted, closed, or moved back to **active** if misclassified.

## Interpreting common requests

When a user asks something in everyday language, translate it into `list_conversations` filters using the table below. If a request is ambiguous, prefer the interpretation that surfaces conversations needing action.

| User asks… | Likely intent | Filters to apply |
|---|---|---|
| "Show me new conversations" / "What are the latest tickets" / "What's come in?" | Unassigned conversations waiting for a user | `status: ['active']`, `assignedTo: 'anyone'` (unassigned) |
| "What's in my inbox" / "Show me my conversations" / "What do I need to reply to" | Conversations assigned to the caller that need a reply | Call `whoami`, then `assignedTo: <id>`, `status: ['active']` |
| "What am I waiting on customers for" | Conversations assigned to the caller, waiting for the customer | Call `whoami`, then `assignedTo: <id>`, `status: ['pending']` |
| "Show me everything open" / "What's still going" | Anything not closed | `status: ['active', 'pending']` |
| "Show me closed/resolved conversations" | Finished conversations | `status: ['closed']` |
| "Show me spam" | Spam-flagged conversations | `status: ['spam']` |
| "Find the conversation about <topic>" | Subject substring search | `subject: '<topic>'` (subjects only — body search is not supported) |

When the user names a person, mailbox, or tag, combine that filter with the state filter above rather than dropping the state filter. "Show me Bob's tickets" almost always means active ones unless they say otherwise.

## Acting as the current user

- To answer anything that needs the caller's identity ("my conversations", "assign to me", etc.), call `whoami` first to discover the calling user's FreeScout ID, name, and email.
- Pass that ID into filters such as `list_conversations({ assignedTo: <id> })` or write fields such as `assignedTo` on `update_conversation`.

## Drafts vs. sending

- `create_conversation` and `draft_conversation_reply` always save customer-facing messages as **drafts**. They are **never sent**.
- A human must review and publish a draft in FreeScout's web UI for the customer to receive it. There is no API to send mail from this server.
- Only create a draft when you are confident in its contents. If you create one in error, tell the user clearly so they know to discard it in FreeScout.

## Deletion and editing

- The FreeScout API does **not** expose endpoints to edit or delete individual threads (replies, notes, or drafts) on a conversation.
- The only deletion this server can perform is `delete_conversation`, which **permanently** removes an entire conversation and every thread, draft, note, and attachment it contains. This is **irreversible** — FreeScout provides no recovery path through the API or the web UI.
- If a user asks you to delete or edit a single thread, draft, or note, do **not** call `delete_conversation`. Tell the user to discard or edit that thread in FreeScout's web UI instead.
- Only call `delete_conversation` when the user has explicitly and unambiguously asked for the entire conversation to be deleted. If in doubt, confirm first.

## Search

- Full-text search across thread bodies is **not** available.
- `list_conversations` supports case-insensitive substring search on conversation **subjects** only; body and thread content cannot be searched through the API.

## Module-gated tools

Some tools require optional FreeScout modules and will fail if the module is not installed:

- **Tags module** — `list_tags`, `update_conversation_tags`
- **Custom Fields module** — `list_mailbox_custom_fields`, `update_conversation_custom_fields`
- **CRM module** — `update_customer_fields`
- **Time Tracking module** — `list_conversation_timelogs`

## Discovery tips

- Before calling `update_conversation_custom_fields`, call `list_mailbox_custom_fields` to discover the valid field IDs and types for the conversation's mailbox.
- Customers are matched by email on creation: `create_conversation` will reuse an existing customer if one matches `customerEmail`, otherwise it creates one.
