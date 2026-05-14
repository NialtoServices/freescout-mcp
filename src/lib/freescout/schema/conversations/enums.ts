import { z } from 'zod'

/** Status values FreeScout recognises on a conversation. */
export const ConversationStatusSchema = z.enum(['active', 'pending', 'closed', 'spam'])

/** State values FreeScout recognises on a conversation. */
export const ConversationStateSchema = z.enum(['draft', 'published', 'deleted'])

/** Conversation creation types FreeScout supports. */
export const ConversationTypeSchema = z.enum(['email', 'phone', 'chat'])

/** Single embed value FreeScout's conversation endpoints accept on the `embed` query parameter. */
export const ConversationEmbedSchema = z.enum(['threads', 'timelogs', 'tags'])

/** Sortable fields supported by `GET /conversations`. */
export const ConversationSortFieldSchema = z.enum([
  'createdAt',
  'mailboxId',
  'number',
  'subject',
  'updatedAt',
  'waitingSince'
])

/** Generic sort direction (the FreeScout API uses these on every sortable endpoint). */
export const SortOrderSchema = z.enum(['asc', 'desc'])

/** Thread types FreeScout accepts on `POST /conversations/{id}/threads`. */
export const ThreadTypeSchema = z.enum(['customer', 'message', 'note'])

export type ConversationStatus = z.infer<typeof ConversationStatusSchema>
export type ConversationState = z.infer<typeof ConversationStateSchema>
export type ConversationType = z.infer<typeof ConversationTypeSchema>
export type ConversationEmbed = z.infer<typeof ConversationEmbedSchema>
export type ConversationSortField = z.infer<typeof ConversationSortFieldSchema>
export type SortOrder = z.infer<typeof SortOrderSchema>
export type ThreadType = z.infer<typeof ThreadTypeSchema>
