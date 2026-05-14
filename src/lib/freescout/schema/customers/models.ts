import { z } from 'zod'
import { createPaginatedSchema, NullableStringSchema, ResourceIdSchema } from '../shared'

export const CustomerSummarySchema = z.looseObject({
  id: ResourceIdSchema,
  type: z.literal('customer'),
  firstName: NullableStringSchema,
  lastName: NullableStringSchema,
  photoUrl: NullableStringSchema,
  email: NullableStringSchema
})

export const EmailEntrySchema = z.looseObject({
  id: z.number(),
  value: z.string(),
  type: NullableStringSchema
})

export const PhoneEntrySchema = z.looseObject({
  id: z.number(),
  value: NullableStringSchema,
  type: NullableStringSchema
})

export const SocialProfileEntrySchema = z.looseObject({
  id: z.number(),
  value: NullableStringSchema,
  type: NullableStringSchema
})

export const WebsiteEntrySchema = z.looseObject({
  id: z.number(),
  value: NullableStringSchema
})

export const AddressSchema = z.looseObject({
  city: NullableStringSchema,
  state: NullableStringSchema,
  zip: NullableStringSchema,
  country: NullableStringSchema,
  address: NullableStringSchema
})

export const CustomerFieldValueSchema = z.looseObject({
  id: ResourceIdSchema,
  name: z.string(),
  value: NullableStringSchema,
  text: NullableStringSchema
})

export const CustomerSchema = z.looseObject({
  id: ResourceIdSchema,
  firstName: NullableStringSchema,
  lastName: NullableStringSchema,
  jobTitle: NullableStringSchema,
  company: NullableStringSchema,
  photoType: NullableStringSchema,
  photoUrl: NullableStringSchema,
  createdAt: NullableStringSchema,
  updatedAt: NullableStringSchema,
  notes: NullableStringSchema,
  customerFields: z.array(CustomerFieldValueSchema).nullish(),
  _embedded: z.looseObject({
    emails: z.array(EmailEntrySchema).nullish(),
    phones: z.array(PhoneEntrySchema).nullish(),
    social_profiles: z.array(SocialProfileEntrySchema).nullish(),
    websites: z.array(WebsiteEntrySchema).nullish(),
    address: AddressSchema.nullish()
  })
})

export const PaginatedCustomersSchema = createPaginatedSchema('customers', CustomerSchema)

export type CustomerSummary = z.infer<typeof CustomerSummarySchema>
export type EmailEntry = z.infer<typeof EmailEntrySchema>
export type PhoneEntry = z.infer<typeof PhoneEntrySchema>
export type SocialProfileEntry = z.infer<typeof SocialProfileEntrySchema>
export type WebsiteEntry = z.infer<typeof WebsiteEntrySchema>
export type Address = z.infer<typeof AddressSchema>
export type CustomerFieldValue = z.infer<typeof CustomerFieldValueSchema>
export type Customer = z.infer<typeof CustomerSchema>
export type PaginatedCustomers = z.infer<typeof PaginatedCustomersSchema>
