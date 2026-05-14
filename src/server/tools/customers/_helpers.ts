import { z } from 'zod'

/** Reusable Zod fragment for an email-address entry in customer create/update inputs. */
export const emailEntrySchema = z
  .object({
    value: z.email().describe('Email address'),
    type: z.string().optional().describe('Label for the address (e.g. "work", "home")')
  })
  .strict()

/** Reusable Zod fragment for a phone-number entry in customer create/update inputs. */
export const phoneEntrySchema = z
  .object({
    value: z.string().min(1).describe('Phone number'),
    type: z.string().optional().describe('Label for the number (e.g. "mobile")')
  })
  .strict()

/** Reusable Zod fragment for a social-profile entry in customer create/update inputs. */
export const socialProfileEntrySchema = z
  .object({
    value: z.string().min(1).describe('Social profile handle or URL'),
    type: z.string().optional().describe('Network name (e.g. "twitter")')
  })
  .strict()

/** Reusable Zod fragment for a website entry in customer create/update inputs. */
export const websiteEntrySchema = z.object({ value: z.string().min(1).describe('Website URL') }).strict()

/** Reusable Zod fragment for a customer address in create/update inputs. */
export const addressInputSchema = z
  .object({
    address: z.string().optional().describe('Street address line'),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
  })
  .strict()
