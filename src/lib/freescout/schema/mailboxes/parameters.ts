import { z } from 'zod'
import { PageSchema, PageSizeSchema } from '../shared'

export const ListMailboxesParametersSchema = z
  .object({
    userId: z.number().optional(),
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export const ListMailboxCustomFieldsParametersSchema = z
  .object({
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export const ListMailboxFoldersParametersSchema = z
  .object({
    userId: z.number().optional(),
    folderId: z.number().optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export type ListMailboxesParameters = z.infer<typeof ListMailboxesParametersSchema>
export type ListMailboxCustomFieldsParameters = z.infer<typeof ListMailboxCustomFieldsParametersSchema>
export type ListMailboxFoldersParameters = z.infer<typeof ListMailboxFoldersParametersSchema>
