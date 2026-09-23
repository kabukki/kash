import { describe, expect, it } from 'vitest'
import {
  extractField,
  parseAmount,
  parseTable,
  rowText,
  toRows,
} from './payslip'

// ponytail: 5pt per char stands in for real glyph widths
const item = (str: string, x: number, y: number) => ({
  str,
  transform: [1, 0, 0, 1, x, y],
  width: str.length * 5,
})

describe('toRows', () => {
  it('groups runs by baseline, top to bottom, left to right', () => {
    const rows = toRows([
      item('3 250,00', 400, 500.4),
      item('Salaire de base', 10, 500),
      item('Net à payer', 10, 100),
      item('2 530,12', 400, 100),
    ])
    expect(rows.map(rowText)).toEqual(['Salaire de base 3 250,00', 'Net à payer 2 530,12'])
  })

  it('splits each number into its own cell with its value', () => {
    const [row] = toRows([item('Salaire de base 151,67 3 250,00', 0, 700)])
    expect(row.map((c) => [c.text, c.value])).toEqual([
      ['Salaire de base', undefined],
      ['151,67', 151.67],
      ['3 250,00', 3250],
    ])
  })

  it('merges runs of one label into a single cell', () => {
    const [row] = toRows([item('Charges', 300, 700), item('patronales', 337, 700)])
    expect(row).toEqual([{ text: 'Charges patronales', x0: 300, x1: 387, y: 700, h: 1 }])
  })
})

describe('parseAmount', () => {
  it('handles comma and dot decimals', () => {
    expect(parseAmount('3 250,00')).toBe(3250)
    expect(parseAmount('1 234.56')).toBe(1234.56)
    expect(parseAmount('12\u202f345,67')).toBe(12345.67)
    expect(parseAmount('7.5000')).toBe(7.5)
  })
})

describe('extractField', () => {
  const rows = toRows([
    item('Base', 200, 720),
    item('Taux', 260, 720),
    item('A payer', 310, 720),
    item('A déduire', 370, 720),
    item('Salaire de base', 10, 700),
    item('151,67', 200, 700),
    item('21,4300', 260, 700),
    item('3 250,00', 310, 700),
    item('SALAIRE BRUT', 10, 690),
    item('3 400.00', 310, 690),
    item('Impôt sur le revenu prélevé à la source', 10, 680),
    item('2 650,00', 200, 680),
    item('7,50', 260, 680),
    item('198,75', 370, 680),
    item('Net à payer avant impôt sur le revenu', 10, 670),
    item('2 650,00', 310, 670),
    item('Net imposable', 10, 660),
    item('2 700,00', 200, 660),
    item('NET À PAYER', 10, 650),
    item('2 451,25', 310, 650),
  ])

  it('reads the field column on the field row', () => {
    expect(extractField(rows, 'base')).toMatchObject({ value: 3250, column: 'A payer' })
    expect(extractField(rows, 'gross')?.value).toBe(3400)
    expect(extractField(rows, 'tax')).toMatchObject({ value: 198.75, column: 'A déduire' })
    expect(extractField(rows, 'netBeforeTax')?.value).toBe(2650)
    expect(extractField(rows, 'netTaxable')).toMatchObject({ value: 2650, column: 'Base' })
    expect(extractField(rows, 'netPaid')?.value).toBe(2451.25)
  })

  it('returns the label and value cells, to highlight them', () => {
    const hit = extractField(rows, 'netPaid')
    expect(hit?.label.map((c) => c.text)).toEqual(['NET À PAYER'])
    expect(hit?.cell.text).toBe('2 451,25')
  })

  it('returns undefined when the row or column is missing', () => {
    expect(extractField(rows.slice(0, 2), 'gross')).toBeUndefined()
    expect(extractField(rows.slice(0, 1).concat(rows.slice(4, 5)), 'tax')).toBeUndefined()
  })
})

describe('parseTable', () => {
  it('keys each number by the header text above it', () => {
    const rows = toRows([
      item('Base', 200, 700),
      item('A payer', 310, 700),
      item('A déduire', 370, 700),
      item('Charges patronales', 480, 700),
      item('Salaire de base', 10, 680),
      item('3 250,00', 310, 680),
      item('Vieillesse plafonnée', 10, 660),
      item('3 250,00', 195, 660),
      item('224,25', 375, 660),
      item('277,88', 500, 660),
      item('Net à payer', 10, 600),
      item('2 451,25', 310, 600),
    ])
    expect(parseTable(rows)).toEqual([
      { label: 'Salaire de base', 'A payer': 3250 },
      { label: 'Vieillesse plafonnée', Base: 3250, 'A déduire': 224.25, 'Charges patronales': 277.88 },
      { label: 'Net à payer', 'A payer': 2451.25 },
    ])
  })

  it('prefixes a repeated header with its group label', () => {
    const rows = toRows([
      item('Part salariale', 270, 720),
      item('Part employeur', 420, 720),
      item('Taux', 260, 700),
      item('Montant', 320, 700),
      item('Taux', 410, 700),
      item('Montant', 470, 700),
      item('Maladie', 10, 680),
      item('7.0000', 410, 680),
      item('227.50', 470, 680),
    ])
    expect(parseTable(rows)).toEqual([
      { label: 'Maladie', 'Part employeur Taux': 7, 'Part employeur Montant': 227.5 },
    ])
  })

  it('walks past non-label text and ignores numbers under no column', () => {
    const rows = toRows([
      item('Base', 200, 700),
      item('Taux', 260, 700),
      item('A déduire', 370, 700),
      item('SANTE', 10, 690),
      item('Mutuelle', 10, 680),
      item('Forfait', 255, 680),
      item('45,00', 375, 680),
      item('Prévoyance', 10, 670),
      item('1,500', 260, 670),
      item('48,75', 375, 670),
      item('99,99', 600, 670),
    ])
    expect(parseTable(rows)).toEqual([
      { label: 'Mutuelle Forfait', 'A déduire': 45 },
      { label: 'Prévoyance', Taux: 1.5, 'A déduire': 48.75 },
    ])
  })
})
