import { z } from 'zod'
import { PageSchema, PageSizeSchema } from '../shared'

export const ListUsersParametersSchema = z
  .object({
    email: z.string().optional(),
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

/**
 * FreeScout requires `byUserId` and accepts mailbox-specific reassignment keys of the form
 * `assignTo[<MAILBOX_ID>]`, each carrying a numeric replacement-user ID. Any other key is rejected.
 */
export const DeleteUserParametersSchema = z
  .object({
    byUserId: z.number()
  })
  .catchall(z.number())
  .refine((value) => Object.keys(value).every((key) => key === 'byUserId' || /^assignTo\[\d+\]$/.test(key)), {
    message: 'Unknown delete-user parameter (expected `byUserId` or `assignTo[<mailboxId>]`)'
  })

export type ListUsersParameters = z.infer<typeof ListUsersParametersSchema>
export type DeleteUserParameters = z.infer<typeof DeleteUserParametersSchema>
