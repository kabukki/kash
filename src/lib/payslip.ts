// Minimal shape of a pdfjs TextItem, so this stays testable without pdfjs.
export type TextItem = { str: string; transform: number[]; width: number }

// A run of text on a visual row: horizontal extent, baseline y and font height (PDF units).
// A number is always a cell of its own, with its parsed `value`.
export type Cell = { text: string; x0: number; x1: number; y: number; h: number; value?: number }
export type Row = Cell[]

export type PayslipField =
  | 'base'
  | 'gross'
  | 'netBeforeTax'
  | 'tax'
  | 'netTaxable'
  | 'netPaid'

export const PAYSLIP_FIELDS: { id: PayslipField; label: string; row: RegExp; column?: RegExp }[] = [
  { id: 'base', label: 'Salaire de base', row: /salaire de base/, column: /a payer|gain/ },
  { id: 'gross', label: 'Salaire brut', row: /salaire brut|total brut|^brut\b/, column: /a payer|gain/ },
  { id: 'netBeforeTax', label: 'Net avant impôt', row: /net a payer avant impot|net avant impot/, column: /a payer/ },
  { id: 'tax', label: 'Impôt sur le revenu', row: /^impot sur le revenu/, column: /a deduire|retenue/ },
  { id: 'netTaxable', label: 'Net imposable', row: /^impot sur le revenu/, column: /base/ },
  { id: 'netPaid', label: 'Net payé', row: /net paye|net a payer(?! avant)/, column: /a payer/ },
]

// Rebuild visual rows: pdfjs gives loose text runs, grouped here by baseline (y).
// Runs closer than MERGE_GAP are one cell ("Charges" + "patronales").
const MERGE_GAP = 4 // ponytail: fixed pt gap, derive from font size if columns get merged
export function toRows(items: TextItem[]): Row[] {
  const rows = new Map<number, TextItem[]>()
  for (const item of items) {
    if (!item.str.trim()) continue
    const y = Math.round(item.transform[5] / 2) // ponytail: 2pt tolerance, breaks on skewed scans
    rows.set(y, [...(rows.get(y) ?? []), item])
  }
  return [...rows.entries()]
    .sort(([a], [b]) => b - a) // PDF y grows upward
    .map(([, row]) => {
      const cells: Cell[] = []
      for (const i of row.sort((a, b) => a.transform[4] - b.transform[4])) {
        const x0 = i.transform[4]
        const last = cells[cells.length - 1]
        if (last && x0 - last.x1 < MERGE_GAP) {
          last.text += (x0 - last.x1 > 0.5 ? ' ' : '') + i.str.trim()
          last.x1 = Math.max(last.x1, x0 + i.width)
        } else
          cells.push({
            text: i.str.trim(),
            x0,
            x1: x0 + i.width,
            y: i.transform[5],
            h: Math.abs(i.transform[3]), // ponytail: font size from the scale, wrong for rotated text
          })
      }
      return cells.flatMap(splitNumbers)
    })
}

// "Salaire de base 151,67 3 250,00" -> text cell + one cell per number.
// ponytail: positions inside a run are estimated by character offset
function splitNumbers(cell: Cell): Cell[] {
  const at = (k: number) => cell.x0 + (cell.x1 - cell.x0) * (k / cell.text.length)
  const out: Cell[] = []
  let last = 0
  const text = (from: number, to: number) => {
    const t = cell.text.slice(from, to).trim()
    if (t) out.push({ ...cell, text: t, x0: at(from), x1: at(to) })
  }
  for (const m of cell.text.matchAll(AMOUNT)) {
    text(last, m.index)
    last = m.index + m[0].length
    out.push({ ...cell, text: m[0], x0: at(m.index), x1: at(last), value: parseAmount(m[0]) })
  }
  text(last, cell.text.length)
  return out
}

export const rowText = (row: Row) => row.map((c) => c.text).join(' ')

// Bounding box [x0, y0, x1, y1] in PDF units, padded a little, descenders included.
export function rowBox(row: Row): [number, number, number, number] {
  const h = Math.max(...row.map((c) => c.h))
  const y = Math.min(...row.map((c) => c.y))
  return [
    Math.min(...row.map((c) => c.x0)) - 2,
    y - h * 0.3,
    Math.max(...row.map((c) => c.x1)) + 2,
    y + h,
  ]
}

// "1 234,56", "1 234.56", "7.5000". Spaces are the only thousands separator,
// so a "." is always the decimal point.
const AMOUNT = /-?\d{1,3}(?:[ \u00a0\u202f]\d{3})*[.,]\d{2,4}(?!\d)/g

export function parseAmount(s: string): number {
  return Number(s.replace(/[ \u00a0\u202f]/g, '').replace(',', '.'))
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// ---- Table -------------------------------------------------------------

// One printed row: its label plus one entry per column, keyed by the header text.
export type TableRow = { label: string; [column: string]: string | number }

const HEADER = /^(base|taux|montant|nombre|quantite|a deduire|a payer|gains?|retenues?|charges|cotisations?|part)\b/

const isNumber = (c: Cell) => c.value !== undefined
const isHeader = (c: Cell) => !isNumber(c) && HEADER.test(normalize(c.text))
const overlaps = (a: Cell, b: Cell) => a.x0 < b.x1 + 2 && a.x1 > b.x0 - 2

// Walk up from the number to the first header label above it. A label printed
// twice ("Taux") is prefixed with the group label above it ("Part employeur").
function columnName(rows: Row[], i: number, cell: Cell): string | undefined {
  for (let r = i - 1; r >= 0; r--) {
    const header = rows[r].find((c) => isHeader(c) && overlaps(c, cell))
    if (!header) continue
    if (rows[r].filter((c) => c.text === header.text).length === 1) return header.text
    const group = rows[r - 1]?.find((c) => !isNumber(c) && overlaps(c, header))
    return group ? `${group.text} ${header.text}` : `${header.text} ${rows[r].indexOf(header)}`
  }
}

// A table row with the page cells behind it, for highlighting.
type Line = { entry: TableRow; label: Row; cells: Record<string, Cell> }

// Rows below the first header row (2+ labels) with at least one number under a column.
function tableLines(rows: Row[]): Line[] {
  const out: Line[] = []
  let inTable = false
  rows.forEach((row, i) => {
    if (row.filter(isHeader).length >= 2) return void (inTable = true)
    if (!inTable) return
    const label = row.filter((c) => !isNumber(c))
    const line: Line = { entry: { label: rowText(label) }, label, cells: {} }
    for (const cell of row) {
      const name = isNumber(cell) && columnName(rows, i, cell)
      if (name) {
        line.entry[name] = cell.value!
        line.cells[name] = cell
      }
    }
    if (Object.keys(line.cells).length) out.push(line)
  })
  return out
}

export const parseTable = (rows: Row[]): TableRow[] => tableLines(rows).map((l) => l.entry)

// First table row matching the field, then its column. Returns the value cell
// so the UI can highlight it.
export function extractField(rows: Row[], id: PayslipField) {
  const field = PAYSLIP_FIELDS.find((f) => f.id === id)!
  for (const { entry, label, cells } of tableLines(rows)) {
    if (!field.row.test(normalize(entry.label))) continue
    const names = Object.keys(cells)
    const column = field.column ? names.find((n) => field.column!.test(normalize(n))) : names.at(-1)
    if (column) return { value: Math.abs(cells[column].value!), column, label, cell: cells[column] }
  }
}
