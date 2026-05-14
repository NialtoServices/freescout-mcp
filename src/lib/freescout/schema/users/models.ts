import { z } from 'zod'
import { createPaginatedSchema, NullableStringSchema, ResourceIdSchema } from '../shared'

export const UserSummarySchema = z.looseObject({
  id: ResourceIdSchema,
  type: z.literal('user'),
  firstName: NullableStringSchema,
  lastName: NullableStringSchema,
  photoUrl: NullableStringSchema,
  email: NullableStringSchema
})

export const UserSchema = z.looseObject({
  id: ResourceIdSchema,
  firstName: NullableStringSchema,
  lastName: NullableStringSchema,
  email: z.string(),
  role: z.string(),
  alternateEmails: NullableStringSchema,
  jobTitle: NullableStringSchema,
  phone: NullableStringSchema,
  timezone: NullableStringSchema,
  photoUrl: NullableStringSchema,
  language: NullableStringSchema,
  createdAt: NullableStringSchema,
  updatedAt: NullableStringSchema
})

export const PaginatedUsersSchema = createPaginatedSchema('users', UserSchema)

export type UserSummary = z.infer<typeof UserSummarySchema>
export type User = z.infer<typeof UserSchema>
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>
