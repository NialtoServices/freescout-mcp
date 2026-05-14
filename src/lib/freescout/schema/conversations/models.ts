import { z } from 'zod'
import { CustomerSummarySchema } from '../customers'
import { createPaginatedSchema, NullableStringSchema, ResourceIdSchema } from '../shared'
import { TagSchema } from '../tags'
import { UserSummarySchema } from '../users'

export const SourceSchema = z.looseObject({
  type: NullableStringSchema,
  via: NullableStringSchema
})

export const CustomerWaitingSinceSchema = z.looseObject({
  time: NullableStringSchema,
  friendly: NullableStringSchema,
  latestReplyFrom: NullableStringSchema
})

export const CustomFieldValueSchema = z.looseObject({
  id: ResourceIdSchema,
  name: z.string(),
  value: NullableStringSchema,
  text: NullableStringSchema
})

export const AttachmentSchema = z.looseObject({
  id: ResourceIdSchema,
  fileName: z.string(),
  fileUrl: z.string(),
  mimeType: NullableStringSchema,
  size: z.number().nullish()
})

export const ThreadActionSchema = z.looseObject({
  type: NullableStringSchema,
  text: NullableStringSchema,
  associatedEntities: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
})

export const TimelogSchema = z.looseObject({
  id: ResourceIdSchema,
  conversationStatus: NullableStringSchema,
  conversationId: z.number().nullish(),
  userId: z.number().nullish(),
  timeSpent: z.number().nullish(),
  paused: z.boolean(),
  finished: z.boolean(),
  createdAt: NullableStringSchema,
  updatedAt: NullableStringSchema
})

export const ThreadSchema = z.looseObject({
  id: ResourceIdSchema,
  type: z.string(),
  status: NullableStringSchema,
  state: NullableStringSchema,
  action: ThreadActionSchema,
  body: NullableStringSchema,
  source: SourceSchema,
  customer: CustomerSummarySchema.nullish(),
  createdBy: z.union([UserSummarySchema, CustomerSummarySchema]).nullish(),
  assignedTo: UserSummarySchema.nullish(),
  to: z.array(z.string()).nullish(),
  cc: z.array(z.string()).nullish(),
  bcc: z.array(z.string()).nullish(),
  createdAt: NullableStringSchema,
  openedAt: NullableStringSchema,
  rating: z.number().nullish(),
  rating_comment: NullableStringSchema,
  _embedded: z
    .looseObject({
      attachments: z.array(AttachmentSchema).nullish()
    })
    .optional()
})

export const ConversationSchema = z.looseObject({
  id: ResourceIdSchema,
  number: z.number(),
  threadsCount: z.number(),
  type: z.string(),
  folderId: z.number().nullish(),
  status: z.string(),
  state: z.string(),
  subject: NullableStringSchema,
  preview: NullableStringSchema,
  mailboxId: z.number(),
  assignee: UserSummarySchema.nullish(),
  createdBy: z.union([UserSummarySchema, CustomerSummarySchema]).nullish(),
  createdAt: NullableStringSchema,
  updatedAt: NullableStringSchema,
  closedBy: z.number().nullish(),
  closedByUser: UserSummarySchema.nullish(),
  closedAt: NullableStringSchema,
  userUpdatedAt: NullableStringSchema,
  customerWaitingSince: CustomerWaitingSinceSchema,
  source: SourceSchema,
  cc: z.array(z.string()).nullish(),
  bcc: z.array(z.string()).nullish(),
  customer: CustomerSummarySchema.nullish(),
  customFields: z.array(CustomFieldValueSchema).nullish(),
  _embedded: z.looseObject({
    threads: z.array(ThreadSchema).optional(),
    timelogs: z.array(TimelogSchema).optional(),
    tags: z.array(TagSchema).optional()
  })
})

export const PaginatedConversationsSchema = createPaginatedSchema('conversations', ConversationSchema)
export const PaginatedTimelogsSchema = createPaginatedSchema('timelogs', TimelogSchema)

export type Source = z.infer<typeof SourceSchema>
export type CustomerWaitingSince = z.infer<typeof CustomerWaitingSinceSchema>
export type CustomFieldValue = z.infer<typeof CustomFieldValueSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type ThreadAction = z.infer<typeof ThreadActionSchema>
export type Timelog = z.infer<typeof TimelogSchema>
export type Thread = z.infer<typeof ThreadSchema>
export type Conversation = z.infer<typeof ConversationSchema>
export type PaginatedConversations = z.infer<typeof PaginatedConversationsSchema>
export type PaginatedTimelogs = z.infer<typeof PaginatedTimelogsSchema>
