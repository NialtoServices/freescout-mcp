import { type Thread } from '../../../lib/freescout'
import { parseDateTime } from '../../helpers'

/** Structural shape shared by `CustomerSummary` and `UserSummary` for display purposes. */
export interface Participant {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

/** Renders the participant string for a thread (e.g. "Ada Lovelace <ada@example.com>"). */
export function renderParticipant(participant: Participant | null | undefined): string {
  if (!participant) return 'N/A'
  const name = [participant.firstName, participant.lastName].filter(Boolean).join(' ')
  if (name && participant.email) return `${name} <${participant.email}>`
  return name || participant.email || 'N/A'
}

/** Renders a single thread as a markdown block. */
export function renderThread(thread: Thread): string {
  const parts: string[] = []
  parts.push(`### Thread #${thread.id} — ${thread.type}${thread.state ? ` (${thread.state})` : ''}`)
  parts.push('')
  parts.push(`- Created At: ${parseDateTime(thread.createdAt)?.toLocaleString() ?? 'N/A'}`)
  parts.push(`- Created By: ${renderParticipant(thread.createdBy)}`)
  if (thread.assignedTo) parts.push(`- Assigned To: ${renderParticipant(thread.assignedTo)}`)
  if (thread.to && thread.to.length > 0) parts.push(`- To: ${thread.to.join(', ')}`)
  if (thread.cc && thread.cc.length > 0) parts.push(`- CC: ${thread.cc.join(', ')}`)
  if (thread.bcc && thread.bcc.length > 0) parts.push(`- BCC: ${thread.bcc.join(', ')}`)
  parts.push('')
  parts.push(thread.body ?? '_(no body)_')
  return parts.join('\n')
}
