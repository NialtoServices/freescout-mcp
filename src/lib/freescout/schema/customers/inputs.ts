import { z } from 'zod'

export const CustomerReferenceSchema = z
  .looseObject({
    id: z.number().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    photoUrl: z.url().optional(),
    notes: z.string().optional()
  })
  .refine((value) => Boolean(value.id || value.email || value.phone || value.firstName), {
    message: 'Customer reference requires id, email, phone, or firstName'
  })

export const AddressInputSchema = z
  .object({
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    lines: z.array(z.string()).optional()
  })
  .strict()

export const EmailEntryInputSchema = z
  .object({
    value: z.email(),
    type: z.string().optional()
  })
  .strict()

export const PhoneEntryInputSchema = z
  .object({
    value: z.string(),
    type: z.string().optional()
  })
  .strict()

export const SocialProfileInputSchema = z
  .object({
    value: z.string(),
    type: z.string().optional()
  })
  .strict()

export const WebsiteInputSchema = z
  .object({
    value: z.string()
  })
  .strict()
