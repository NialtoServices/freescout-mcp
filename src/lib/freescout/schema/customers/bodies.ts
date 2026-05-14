import { z } from 'zod'
import {
  AddressInputSchema,
  EmailEntryInputSchema,
  PhoneEntryInputSchema,
  SocialProfileInputSchema,
  WebsiteInputSchema
} from './inputs'

export const CreateCustomerBodySchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.email().optional(),
    emails: z.array(EmailEntryInputSchema).optional(),
    phone: z.string().optional(),
    phones: z.array(PhoneEntryInputSchema).optional(),
    photoUrl: z.url().optional(),
    jobTitle: z.string().optional(),
    photoType: z.string().optional(),
    address: AddressInputSchema.optional(),
    notes: z.string().optional(),
    company: z.string().optional(),
    socialProfiles: z.array(SocialProfileInputSchema).optional(),
    websites: z.array(WebsiteInputSchema).optional()
  })
  .strict()
  .refine((value) => Boolean(value.firstName || value.email || value.emails?.length), {
    message: 'Create customer requires firstName or at least one email address'
  })

export const UpdateCustomerBodySchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    photoUrl: z.url().optional(),
    jobTitle: z.string().optional(),
    photoType: z.string().optional(),
    address: AddressInputSchema.optional(),
    notes: z.string().optional(),
    company: z.string().optional(),
    emails: z.array(EmailEntryInputSchema).optional(),
    emailsAdd: z.array(EmailEntryInputSchema).optional(),
    phones: z.array(PhoneEntryInputSchema).optional(),
    socialProfiles: z.array(SocialProfileInputSchema).optional(),
    websites: z.array(WebsiteInputSchema).optional()
  })
  .strict()

export const UpdateCustomerFieldsBodySchema = z
  .object({
    customerFields: z.array(
      z
        .object({
          id: z.number(),
          value: z.string()
        })
        .strict()
    )
  })
  .strict()

export type CreateCustomerBody = z.infer<typeof CreateCustomerBodySchema>
export type UpdateCustomerBody = z.infer<typeof UpdateCustomerBodySchema>
export type UpdateCustomerFieldsBody = z.infer<typeof UpdateCustomerFieldsBodySchema>
