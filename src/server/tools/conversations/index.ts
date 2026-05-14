import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import { register as registerAddConversationNote } from './add_conversation_note'
import { register as registerCreateConversation } from './create_conversation'
import { register as registerDeleteConversation } from './delete_conversation'
import { register as registerDraftConversationReply } from './draft_conversation_reply'
import { register as registerGetConversation } from './get_conversation'
import { register as registerListConversationTimelogs } from './list_conversation_timelogs'
import { register as registerListConversations } from './list_conversations'
import { register as registerUpdateConversation } from './update_conversation'
import { register as registerUpdateConversationCustomFields } from './update_conversation_custom_fields'
import { register as registerUpdateConversationTags } from './update_conversation_tags'

/**
 * Registers every conversation-related MCP tool against `server`.
 *
 * Each individual tool lives in its own file named after the tool it registers (e.g.
 * `./list_conversations.ts`, `./add_conversation_note.ts`) and exports a `register(server, client,
 * options)` function; this index file glues them together so a single `registerConversationTools(...)`
 * call brings them all online.
 */
export function registerConversationTools(
  server: McpServer,
  client: FreeScoutClient,
  options: CreateMCPServerOptions
): void {
  registerListConversations(server, client, options)
  registerGetConversation(server, client, options)
  registerCreateConversation(server, client, options)
  registerAddConversationNote(server, client, options)
  registerDraftConversationReply(server, client, options)
  registerUpdateConversation(server, client, options)
  registerListConversationTimelogs(server, client, options)
  registerUpdateConversationTags(server, client, options)
  registerUpdateConversationCustomFields(server, client, options)
  registerDeleteConversation(server, client, options)
}
