import { z } from 'zod'
import { CustomerReferenceSchema } from '../customers/inputs'
import { IsoDateTimeSchema } from '../shared'
import { ThreadTypeSchema } from './enums'

export const ThreadAttachmentInputSchema = z
  .object({
    fileName: z.string(),
    mimeType: z.string(),
    data: z.string().optional(),
    fileUrl: z.url().optional()
  })
  .strict()
  .refine((value) => Boolean(value.data || value.fileUrl), {
    message: 'Attachment requires either data or fileUrl'
  })

export const ConversationThreadInputSchema = z
  .object({
    type: ThreadTypeSchema,
    text: z.string(),
    customer: CustomerReferenceSchema.optional(),
    user: z.number().optional(),
    imported: z.boolean().optional(),
    status: z.string().optional(),
    state: z.string().optional(),
    to: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    createdAt: IsoDateTimeSchema.optional(),
    attachments: z.array(ThreadAttachmentInputSchema).optional()
  })
  .strict()

export const CustomFieldUpdateInputSchema = z
  .object({
    id: z.number(),
    value: z.string()
  })
  .strict()
