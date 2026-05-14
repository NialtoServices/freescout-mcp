import { DateTime } from 'luxon'

// MARK: - Date Helpers

export function parseDateTime(value: string | null | undefined): DateTime | undefined {
  if (!value) return undefined
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : undefined
}

// MARK: - Markdown Helpers

export function renderMarkdownValue(value: any): string {
  if (Array.isArray(value)) {
    return value.map(renderMarkdownValue).join(', ')
  } else if (value === null || value === undefined) {
    return 'N/A'
  } else if (value instanceof Date) {
    return DateTime.fromJSDate(value).toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)
  } else if (value instanceof DateTime) {
    return value.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)
  } else if (typeof value === 'object') {
    return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
  } else if (typeof value === 'string') {
    return value.trim() || 'N/A'
  } else {
    return String(value)
  }
}

export function renderMarkdownTable(headers: any[], rows: any[][]) {
  const escapeCell = (value: string) => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
  const renderRow = (columns: any[]) =>
    `| ${columns.map((column) => escapeCell(renderMarkdownValue(column))).join(' | ')} |`

  return [renderRow(headers), renderRow(headers.map(() => '---')), ...rows.map(renderRow)].join('\n')
}

// MARK: - HTML Helpers

/**
 * Converts plain text into FreeScout-compatible HTML, escaping unsafe characters and turning
 * blank-line-separated paragraphs into `<p>` blocks and single newlines into `<br>` tags.
 *
 * Used by tools that accept plain-text input from an LLM and need to hand HTML to FreeScout.
 * Keeping the conversion server-side means the LLM never has to produce valid HTML directly.
 *
 * @param value Plain text to convert.
 * @returns HTML fragment safe to send to FreeScout's `text` field.
 */
export function plaintextToHtml(value: string): string {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// MARK: - Single-Record Rendering Helpers

/** A label/value pair rendered as a row in a single-record markdown layout. */
export interface RecordField {
  /** Label shown to the LLM (e.g. `'Email'`). */
  label: string

  /** Value rendered via {@link renderMarkdownValue}; null/undefined become `N/A`. */
  value: unknown
}

/** Inputs to {@link renderRecord}. */
export interface RecordRenderOptions {
  /** Top-level heading (e.g. `'Customer #7'`). */
  heading: string

  /** Optional short summary line shown immediately under the heading. */
  summary?: string

  /** Label/value rows to render as a bulleted list. */
  fields: readonly RecordField[]

  /**
   * Optional sections each rendered as their own heading + table. Useful for embedded collections
   * like a customer's email addresses or a conversation's threads.
   */
  sections?: readonly RecordSection[]
}

/** A named table rendered as part of a single-record layout. */
export interface RecordSection {
  /** Heading for the section (rendered as `## {heading}`). */
  heading: string

  /** Column headers, in display order. */
  columns: readonly string[]

  /** Rows of data, each row aligned with `columns`. */
  rows: readonly (readonly unknown[])[]
}

/**
 * Renders the standard "show one record" markdown layout: heading, optional summary, bulleted
 * key/value pairs, and optional named sections with tables. Used by `get_*` tools.
 */
export function renderRecord(options: RecordRenderOptions): string {
  const parts: string[] = [`# ${options.heading}`]
  if (options.summary) parts.push('', options.summary)

  if (options.fields.length > 0) {
    parts.push('')
    for (const { label, value } of options.fields) {
      parts.push(`- ${label}: ${renderMarkdownValue(value)}`)
    }
  }

  for (const section of options.sections ?? []) {
    parts.push('', `## ${section.heading}`)
    if (section.rows.length === 0) {
      parts.push('', '_None_')
    } else {
      parts.push(
        '',
        renderMarkdownTable(
          [...section.columns],
          section.rows.map((row) => [...row])
        )
      )
    }
  }

  return parts.join('\n')
}

// MARK: - Paginated Listing Helpers

/** Shape of the pagination metadata returned by FreeScout list endpoints. */
interface PaginationInfo {
  number: number
  size: number
  totalPages: number
  totalElements: number
}

/** Inputs to {@link renderPaginatedListing}. */
export interface PaginatedListingOptions<T> {
  /** Heading rendered at the top (e.g. `"Customers"`). Also used as the `Total {heading}` row label. */
  heading: string

  /** Pagination metadata, typically `result.page` from a FreeScout list response. */
  pagination: PaginationInfo

  /** Items to render in the table. When empty, only the heading + pagination summary are produced. */
  items: readonly T[]

  /** Column headers, in display order. */
  columns: readonly string[]

  /** Maps a single item to a row of column values, aligned with `columns`. */
  renderRow: (item: T) => readonly unknown[]
}

/**
 * Renders the standard "list tool" markdown layout: heading, pagination summary, then a table of
 * items when any are present.
 */
export function renderPaginatedListing<T>(options: PaginatedListingOptions<T>): string {
  const { heading, pagination, items, columns, renderRow } = options

  let text = `# ${heading}\n\n`
  text += `- Page: ${pagination.number}\n`
  text += `- Page Size: ${pagination.size}\n`
  text += `- Total Pages: ${pagination.totalPages}\n`
  text += `- Total ${heading}: ${pagination.totalElements}`

  if (items.length > 0) {
    text += '\n\n'
    text += renderMarkdownTable(
      [...columns],
      items.map((item) => [...renderRow(item)])
    )
  }

  return text
}
