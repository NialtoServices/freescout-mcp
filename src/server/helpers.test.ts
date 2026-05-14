import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import {
  parseDateTime,
  plaintextToHtml,
  renderMarkdownTable,
  renderMarkdownValue,
  renderPaginatedListing,
  renderRecord
} from './helpers'

describe('parseDateTime', () => {
  it('is expected to parse a well-formed ISO 8601 string into a Luxon DateTime', () => {
    const parsed = parseDateTime('2024-01-02T03:04:05Z')
    expect(parsed?.isValid).toBe(true)
    expect(parsed?.toUTC().toISO()).toBe('2024-01-02T03:04:05.000Z')
  })

  it('is expected to return undefined when the input is null', () => {
    expect(parseDateTime(null)).toBeUndefined()
  })

  it('is expected to return undefined when the input is undefined', () => {
    expect(parseDateTime(undefined)).toBeUndefined()
  })

  it('is expected to return undefined when the input is an empty string', () => {
    expect(parseDateTime('')).toBeUndefined()
  })

  it('is expected not to return an invalid DateTime when the input is unparseable', () => {
    expect(parseDateTime('not-a-date')).toBeUndefined()
  })
})

describe('renderMarkdownValue', () => {
  it('is expected to render N/A for null and undefined', () => {
    expect(renderMarkdownValue(null)).toBe('N/A')
    expect(renderMarkdownValue(undefined)).toBe('N/A')
  })

  it('is expected to render trimmed strings unchanged and N/A for whitespace-only strings', () => {
    expect(renderMarkdownValue('  hello  ')).toBe('hello')
    expect(renderMarkdownValue('   ')).toBe('N/A')
  })

  it('is expected to render numbers and booleans as their string form', () => {
    expect(renderMarkdownValue(42)).toBe('42')
    expect(renderMarkdownValue(true)).toBe('true')
    expect(renderMarkdownValue(false)).toBe('false')
  })

  it('is expected to render arrays as a comma-separated list of their rendered elements', () => {
    expect(renderMarkdownValue(['one', 'two', 'three'])).toBe('one, two, three')
  })

  it('is expected to render an empty array as the empty string', () => {
    expect(renderMarkdownValue([])).toBe('')
  })

  it('is expected to render a Luxon DateTime as a human-readable timestamp', () => {
    const dt = DateTime.fromISO('2024-01-02T03:04:05Z', { zone: 'utc' })
    expect(renderMarkdownValue(dt)).toMatch(/2024/)
  })

  it('is expected to render plain objects as a fenced JSON code block', () => {
    const rendered = renderMarkdownValue({ a: 1, b: 'two' })
    expect(rendered.startsWith('```json\n')).toBe(true)
    expect(rendered).toContain('"a": 1')
    expect(rendered).toContain('"b": "two"')
    expect(rendered.endsWith('\n```')).toBe(true)
  })
})

describe('plaintextToHtml', () => {
  it('is expected to wrap a single line in a paragraph element', () => {
    expect(plaintextToHtml('Hello')).toBe('<p>Hello</p>')
  })

  it('is expected to render blank-line-separated chunks as separate paragraphs', () => {
    expect(plaintextToHtml('First.\n\nSecond.')).toBe('<p>First.</p>\n<p>Second.</p>')
  })

  it('is expected to render single newlines inside a paragraph as <br>', () => {
    expect(plaintextToHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>')
  })

  it('is expected to escape HTML-significant characters', () => {
    expect(plaintextToHtml('<script>alert("x")</script> & all')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; all</p>'
    )
  })

  it('is expected to ignore leading and trailing whitespace around paragraphs', () => {
    expect(plaintextToHtml('\n\n  Hello  \n\n')).toBe('<p>Hello</p>')
  })

  it('is expected to return an empty string when the input is only whitespace', () => {
    expect(plaintextToHtml('   \n\n   ')).toBe('')
  })
})

describe('renderMarkdownTable', () => {
  it('is expected to render a header row, separator row, and one row per data entry', () => {
    const table = renderMarkdownTable(
      ['A', 'B'],
      [
        ['one', 'two'],
        ['three', 'four']
      ]
    )
    expect(table.split('\n')).toEqual(['| A | B |', '| --- | --- |', '| one | two |', '| three | four |'])
  })

  it('is expected to escape pipe characters within cell values', () => {
    const table = renderMarkdownTable(['Col'], [['a | b']])
    expect(table).toContain('| a \\| b |')
  })

  it('is expected to replace newline characters in cell values with <br> to preserve table layout', () => {
    const table = renderMarkdownTable(['Col'], [['line one\nline two']])
    expect(table).toContain('| line one<br>line two |')
  })

  it('is expected to escape backslashes in cell values', () => {
    const table = renderMarkdownTable(['Col'], [['a\\b']])
    expect(table).toContain('| a\\\\b |')
  })
})

describe('renderPaginatedListing', () => {
  const pagination = { number: 2, size: 20, totalPages: 5, totalElements: 100 }

  it('is expected to render the heading and the pagination summary', () => {
    const output = renderPaginatedListing({
      heading: 'Customers',
      pagination,
      items: [],
      columns: ['ID'],
      renderRow: () => []
    })
    expect(output).toContain('# Customers')
    expect(output).toContain('- Page: 2')
    expect(output).toContain('- Page Size: 20')
    expect(output).toContain('- Total Pages: 5')
    expect(output).toContain('- Total Customers: 100')
  })

  it('is expected not to render a table when items is empty', () => {
    const output = renderPaginatedListing({
      heading: 'Customers',
      pagination,
      items: [],
      columns: ['ID'],
      renderRow: () => []
    })
    expect(output).not.toContain('|')
  })

  it('is expected to render a table when items are present', () => {
    const output = renderPaginatedListing({
      heading: 'Customers',
      pagination,
      items: [{ id: 1, name: 'Ada' }],
      columns: ['ID', 'Name'],
      renderRow: (customer) => [customer.id, customer.name]
    })
    expect(output).toContain('| ID | Name |')
    expect(output).toContain('| 1 | Ada |')
  })

  it('is expected to use the heading verbatim in the total-elements label', () => {
    const output = renderPaginatedListing({
      heading: 'Mailboxes',
      pagination,
      items: [],
      columns: ['ID'],
      renderRow: () => []
    })
    expect(output).toContain('- Total Mailboxes: 100')
  })
})

describe('renderRecord', () => {
  it('is expected to render the heading as the top-level title', () => {
    const output = renderRecord({ heading: 'Customer #7', fields: [] })
    expect(output.startsWith('# Customer #7')).toBe(true)
  })

  it('is expected to render the summary line on its own beneath the heading when present', () => {
    const output = renderRecord({ heading: 'Customer #7', summary: 'Ada Lovelace', fields: [] })
    expect(output).toContain('# Customer #7\n\nAda Lovelace')
  })

  it('is expected to render each supplied field as a bullet, passing the value through renderMarkdownValue', () => {
    const output = renderRecord({
      heading: 'Customer #7',
      fields: [
        { label: 'First Name', value: 'Ada' },
        { label: 'Notes', value: null }
      ]
    })
    expect(output).toContain('- First Name: Ada')
    expect(output).toContain('- Notes: N/A')
  })

  it('is expected not to render a bullet list when fields is empty', () => {
    const output = renderRecord({ heading: 'Customer #7', fields: [] })
    expect(output).not.toContain('- ')
  })

  it('is expected to render each section as a sub-heading followed by a markdown table', () => {
    const output = renderRecord({
      heading: 'Customer #7',
      fields: [],
      sections: [
        {
          heading: 'Email Addresses',
          columns: ['Value', 'Type'],
          rows: [['ada@example.com', 'work']]
        }
      ]
    })
    expect(output).toContain('## Email Addresses')
    expect(output).toContain('| Value | Type |')
    expect(output).toContain('| ada@example.com | work |')
  })

  it('is expected to render an empty section as a `_None_` placeholder rather than an empty table', () => {
    const output = renderRecord({
      heading: 'Customer #7',
      fields: [],
      sections: [{ heading: 'Phone Numbers', columns: ['Value'], rows: [] }]
    })
    expect(output).toContain('## Phone Numbers')
    expect(output).toContain('_None_')
    expect(output).not.toContain('| Value |')
  })
})
