import { z } from 'zod'
import { IsoDateTimeSchema, PageSchema, PageSizeSchema } from '../shared'
import {
  ConversationEmbedSchema,
  ConversationSortFieldSchema,
  ConversationStateSchema,
  ConversationStatusSchema,
  ConversationTypeSchema,
  SortOrderSchema
} from './enums'

export const ListConversationsParametersSchema = z
  .object({
    embed: z.union([z.string(), z.array(ConversationEmbedSchema)]).optional(),
    mailboxId: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
    folderId: z.number().optional(),
    status: z.union([z.string(), z.array(ConversationStatusSchema)]).optional(),
    state: ConversationStateSchema.optional(),
    type: ConversationTypeSchema.optional(),
    assignedTo: z.union([z.string(), z.number()]).optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    customerId: z.number().optional(),
    number: z.number().optional(),
    subject: z.string().optional(),
    tag: z.string().optional(),
    createdByUserId: z.number().optional(),
    createdByCustomerId: z.number().optional(),
    createdSince: IsoDateTimeSchema.optional(),
    updatedSince: IsoDateTimeSchema.optional(),
    sortField: ConversationSortFieldSchema.optional(),
    sortOrder: SortOrderSchema.optional(),
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export const GetConversationParametersSchema = z
  .object({
    embed: z.union([z.string(), z.array(ConversationEmbedSchema)]).optional()
  })
  .strict()

export const ListConversationTimelogsParametersSchema = z
  .object({
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export type ListConversationsParameters = z.infer<typeof ListConversationsParametersSchema>
export type GetConversationParameters = z.infer<typeof GetConversationParametersSchema>
export type ListConversationTimelogsParameters = z.infer<typeof ListConversationTimelogsParametersSchema>
