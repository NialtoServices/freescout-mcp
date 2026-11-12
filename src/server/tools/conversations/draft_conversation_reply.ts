import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, ThreadSchema, type Conversation } from '../../../lib/freescout'
import { plaintextToHtml } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

/** The conversation's CCs, less the customer the reply is already addressed to. */
function inheritedCc(conversation: Conversation): string[] {
  const customerEmail = conversation.customer?.email?.toLowerCase()
  return (conversation.cc ?? []).filter((address) => address.toLowerCase() !== customerEmail)
}

export function register(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'draft_conversation_reply',
    {
      title: 'Draft Conversation Reply',
      description:
        "Create a draft customer-facing reply on a FreeScout conversation. Saved as a draft for human review; does not send email. The draft is CC'd to the conversation's existing CCs unless `cc` is given.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID to draft a reply on'),
        text: z.string().min(1).describe('Reply body (plain text; converted to HTML before saving)'),
        cc: z
          .array(z.email())
          .optional()
          .describe(
            "CC recipients for the draft, replacing the conversation's existing CCs. Omit to keep the conversation's CCs; pass an empty array for no CCs."
          )
      }),
      outputSchema: z.object({ conversationId: z.number(), thread: ThreadSchema, state: z.literal('draft') })
    },
    async ({ conversationId, text, cc }, context) => {
      const currentUser = options.getCurrentUser(context)
      const ccRecipients = cc ?? inheritedCc(await client.conversations.get(conversationId))
      const { data: thread } = await client.conversations.createThread(conversationId, {
        type: 'message',
        text: plaintextToHtml(text),
        user: currentUser.id,
        state: 'draft',
        cc: ccRecipients
      })

      return {
        content: [
          {
            type: 'text',
            text: [
              `Drafted reply on conversation #${conversationId} (thread id ${thread.id}, state: draft).`,
              `Authored as: ${currentUser.firstName} ${currentUser.lastName} <${currentUser.email}>.`,
              `CC: ${ccRecipients.length > 0 ? ccRecipients.join(', ') : 'none'}${cc ? '' : ' (copied from the conversation)'}.`,
              '',
              'This draft is **not sent**. A human must review and publish it in FreeScout.'
            ].join('\n')
          }
        ],
        structuredContent: { conversationId, thread, state: 'draft' }
      }
    }
  )
}
