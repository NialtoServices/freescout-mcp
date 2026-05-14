import { z } from 'zod'
import { CustomerReferenceSchema } from '../customers/inputs'
import { IsoDateTimeSchema } from '../shared'
import { ConversationTypeSchema } from './enums'
import { ConversationThreadInputSchema, CustomFieldUpdateInputSchema } from './inputs'

export const CreateConversationBodySchema = z
  .object({
    type: ConversationTypeSchema,
    mailboxId: z.number(),
    subject: z.string(),
    customer: CustomerReferenceSchema,
    threads: z.array(ConversationThreadInputSchema).min(1),
    imported: z.boolean().optional(),
    assignTo: z.number().optional(),
    status: z.string().optional(),
    state: z.string().optional(),
    customFields: z.array(CustomFieldUpdateInputSchema).optional(),
    createdAt: IsoDateTimeSchema.optional(),
    closedAt: IsoDateTimeSchema.optional()
  })
  .strict()

export const UpdateConversationBodySchema = z
  .object({
    byUser: z.number().optional(),
    status: z.string().optional(),
    assignTo: z.number().optional(),
    mailboxId: z.number().optional(),
    customerId: z.number().optional(),
    subject: z.string().optional()
  })
  .strict()

export const CreateThreadBodySchema = ConversationThreadInputSchema

export const ReplaceConversationTagsBodySchema = z
  .object({
    tags: z.array(z.string())
  })
  .strict()

export const UpdateConversationCustomFieldsBodySchema = z
  .object({
    customFields: z.array(CustomFieldUpdateInputSchema)
  })
  .strict()

export type CreateConversationBody = z.infer<typeof CreateConversationBodySchema>
export type UpdateConversationBody = z.infer<typeof UpdateConversationBodySchema>
export type CreateThreadBody = z.infer<typeof CreateThreadBodySchema>
export type ReplaceConversationTagsBody = z.infer<typeof ReplaceConversationTagsBodySchema>
export type UpdateConversationCustomFieldsBody = z.infer<typeof UpdateConversationCustomFieldsBodySchema>
