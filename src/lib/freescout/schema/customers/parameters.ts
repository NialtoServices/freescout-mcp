import { z } from 'zod'
import { IsoDateTimeSchema, PageSchema, PageSizeSchema } from '../shared'

export const ListCustomersParametersSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    updatedSince: IsoDateTimeSchema.optional(),
    sortField: z.enum(['createdAt', 'firstName', 'lastName', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: PageSchema.optional(),
    pageSize: PageSizeSchema.optional()
  })
  .strict()

export type ListCustomersParameters = z.infer<typeof ListCustomersParametersSchema>
