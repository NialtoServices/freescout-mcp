import { z } from 'zod'

export const CreateUserBodySchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.email(),
    password: z.string().optional(),
    alternateEmails: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
    timezone: z.string().optional(),
    photoUrl: z.url().optional()
  })
  .strict()

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>
