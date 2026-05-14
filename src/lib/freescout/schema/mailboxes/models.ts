import { z } from 'zod'
import { createPaginatedSchema, NullableStringSchema, ResourceIdSchema } from '../shared'

export const CustomFieldDefinitionSchema = z.looseObject({
  id: ResourceIdSchema,
  name: z.string(),
  type: z.string(),
  options: z.unknown().nullish(),
  required: z.boolean(),
  sortOrder: z.number()
})

export const MailboxSchema = z.looseObject({
  id: ResourceIdSchema,
  name: z.string(),
  email: z.email().nullish(),
  createdAt: NullableStringSchema,
  updatedAt: NullableStringSchema
})

export const FolderSchema = z.looseObject({
  id: ResourceIdSchema,
  name: NullableStringSchema,
  type: z.number(),
  userId: z.number().nullish(),
  totalCount: z.number().nullish(),
  activeCount: z.number().nullish(),
  meta: z.unknown().nullish()
})

export const PaginatedMailboxesSchema = createPaginatedSchema('mailboxes', MailboxSchema)
export const PaginatedMailboxCustomFieldsSchema = createPaginatedSchema('custom_fields', CustomFieldDefinitionSchema)
export const PaginatedFoldersSchema = createPaginatedSchema('folders', FolderSchema)

export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>
export type Mailbox = z.infer<typeof MailboxSchema>
export type Folder = z.infer<typeof FolderSchema>
export type PaginatedMailboxes = z.infer<typeof PaginatedMailboxesSchema>
export type PaginatedMailboxCustomFields = z.infer<typeof PaginatedMailboxCustomFieldsSchema>
export type PaginatedFolders = z.infer<typeof PaginatedFoldersSchema>
