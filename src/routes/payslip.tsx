import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import clsx from 'clsx'
import type { PDFDocumentProxy, PageViewport, RenderTask } from 'pdfjs-dist'
import { Button } from '../components'
import {
  PAYSLIP_FIELDS,
  extractField,
  parseTable,
  rowBox,
  rowText,
  toRows,
  type PayslipField,
  type Row,
  type TableRow,
} from '../lib/payslip'

export const Route = createFileRoute('/payslip')({
  ssr: false,
  component: PayslipPage,
  head: () => ({
    meta: [{ title: 'Fiche de paie — Analyse de votre bulletin' }],
  }),
})

type Loaded = Awaited<ReturnType<typeof loadPdf>>

// pdfjs touches browser globals at import time, so load it lazily on the client.
// Text is read once here; each field is extracted on demand from these rows.
async function loadPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import(
    'pdfjs-dist/build/pdf.worker.min.mjs?url'
  )
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: Row[][] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent()
    pages.push(toRows(items.flatMap((i) => ('str' in i ? [i] : []))))
  }
  return { file, pdf, pages }
}

function PayslipPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setLoaded(await loadPdf(file))
    } catch {
      setError('Impossible de lire ce PDF.')
    }
  }

  function close() {
    loaded?.pdf.loadingTask.destroy()
    setLoaded(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <div className="text-balance mb-2 max-w-xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
            Analysez votre fiche de paie
          </h2>
          <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
            Le fichier reste sur votre appareil, rien n'est envoyé.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button icon={FileUp} iconPosition="left" onClick={() => inputRef.current?.click()}>
          Importer ma fiche de paie
        </Button>
        {error && <p className="text-clay text-sm m-0">{error}</p>}
      </div>

      {loaded && <Viewer loaded={loaded} onClose={close} />}
    </div>
  )
}

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

// A row to highlight on a given page (0-based).
type Mark = { page: number; row: Row }
type Found = NonNullable<ReturnType<typeof extractField>> & { page: number }
// null = extracted but not found in the PDF.
type Extracted = Partial<Record<PayslipField, Found | null>>

function Viewer({ loaded, onClose }: { loaded: Loaded; onClose: () => void }) {
  const { file, pdf, pages } = loaded
  const [values, setValues] = useState<Extracted>({})
  const [table, setTable] = useState<TableRow[] | null>(null)
  const [focus, setFocus] = useState<PayslipField | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function extract(id: PayslipField) {
    let found: Found | null = null
    for (const [page, rows] of pages.entries()) {
      const hit = extractField(rows, id)
      if (hit) {
        found = { ...hit, page }
        break
      }
    }
    setValues((v) => ({ ...v, [id]: found }))
    setFocus(id)
  }

  const focused = focus && values[focus]
  const marks: Mark[] = focused ? [{ page: focused.page, row: [focused.cell] }] : []

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex bg-cream-alt">
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6">
        {Array.from({ length: pdf.numPages }, (_, i) => (
          <PdfPage
            key={i}
            pdf={pdf}
            pageNumber={i + 1}
            marks={marks.filter((m) => m.page === i).map((m) => m.row)}
          />
        ))}
      </div>

      <aside className="w-96 shrink-0 bg-cream-surface border-l border-cream-border flex flex-col">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-cream-border">
          <h3 className="font-display text-lg font-semibold text-ink m-0 truncate" title={file.name}>
            {file.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 inline-flex items-center justify-center size-8 rounded-full text-ink-muted hover:text-ink hover:bg-cream-alt transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-auto p-4 flex flex-col gap-2 text-sm">
          {PAYSLIP_FIELDS.map(({ id, label }) => (
            <FieldButton
              key={id}
              label={label}
              onClick={() => extract(id)}
              value={values[id] === undefined ? undefined : (values[id]?.value ?? null)}
              source={values[id] && `${rowText(values[id].label)} · ${values[id].column}`}
              focused={focus === id}
            />
          ))}
          <button
            type="button"
            onClick={() => setTable(pages.flatMap(parseTable))} // headers are found again on each page
            className="px-3 py-2.5 rounded-xl border border-cream-border text-left text-ink-muted hover:text-ink hover:bg-cream-alt transition-colors cursor-pointer"
          >
            Tableau
          </button>
          {table && <Table rows={table} />}
        </div>
      </aside>
    </div>
  )
}

function FieldButton({
  label,
  value,
  source,
  onClick,
  focused,
}: {
  label: string
  value: number | null | undefined
  source?: string | null
  onClick: () => void
  focused: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-baseline justify-between gap-4 px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer',
        focused
          ? 'border-yellow-400 bg-yellow-100 text-ink'
          : value === undefined
            ? 'border-cream-border text-ink-muted hover:text-ink hover:bg-cream-alt'
            : 'border-transparent bg-cream-alt text-ink',
      )}
    >
      <span className="min-w-0">
        {label}
        {source && <span className="block text-xs text-ink-soft truncate">{source}</span>}
      </span>
      <span className="tabular-nums font-medium shrink-0">
        {value === undefined ? (
          <span className="text-ink-soft font-normal text-xs">Extraire</span>
        ) : value === null ? (
          <span className="text-ink-soft font-normal">Introuvable</span>
        ) : (
          EUR.format(value)
        )}
      </span>
    </button>
  )
}

// Columns are whatever headers the rows carry, in first-seen order.
function Table({ rows }: { rows: TableRow[] }) {
  if (!rows.length) return <p className="text-ink-soft px-3 m-0">Aucun tableau trouvé.</p>
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== 'label')
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr className="text-ink-soft text-left">
            <th className="font-normal p-1.5" />
            {columns.map((c) => (
              <th key={c} className="font-normal p-1.5 text-right whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-cream-border">
              <td className="p-1.5 text-ink-muted max-w-40 truncate" title={row.label}>
                {row.label}
              </td>
              {columns.map((c) => (
                <td key={c} className="p-1.5 text-right tabular-nums text-ink">
                  {row[c] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PdfPage({
  pdf,
  pageNumber,
  marks,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  marks: Row[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)

  useEffect(() => {
    let task: RenderTask | undefined
    pdf.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current
      if (!canvas) return
      // Render at screen height in device pixels; CSS then fits it to the pane.
      // ponytail: not re-rendered on resize, blurs if the window grows a lot
      const dpr = window.devicePixelRatio || 1
      const scale = (window.innerHeight * dpr) / page.getViewport({ scale: 1 }).height
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height
      setViewport(viewport)
      task = page.render({ canvas, viewport })
      task.promise.catch(() => {}) // cancelled on unmount
    })
    return () => task?.cancel()
  }, [pdf, pageNumber])

  return (
    // Canvas fits the pane (height minus its p-6, and width) without distortion:
    // max-* on a replaced element keeps its pixel ratio. The wrapper shrinks to
    // it so marks can use percentages.
    <div className="relative shrink-0 max-w-full shadow-app bg-white">
      <canvas ref={canvasRef} className="block w-auto h-auto max-w-full max-h-[calc(100dvh-3rem)]" />
      {viewport &&
        marks.map((row, i) => {
          // Percentages of the page, so boxes follow the canvas when CSS shrinks it.
          const [x0, y0, x1, y1] = rowBox(row)
          const [ax, ay] = viewport.convertToViewportPoint(x0, y0)
          const [bx, by] = viewport.convertToViewportPoint(x1, y1)
          return (
            <div
              key={i}
              ref={i === 0 ? (el) => el?.scrollIntoView({ block: 'center', behavior: 'smooth' }) : undefined}
              className="absolute bg-yellow-300/40 ring-2 ring-yellow-400 rounded-sm pointer-events-none mix-blend-multiply"
              style={{
                left: `${(Math.min(ax, bx) / viewport.width) * 100}%`,
                top: `${(Math.min(ay, by) / viewport.height) * 100}%`,
                width: `${(Math.abs(bx - ax) / viewport.width) * 100}%`,
                height: `${(Math.abs(by - ay) / viewport.height) * 100}%`,
              }}
            />
          )
        })}
    </div>
  )
}
