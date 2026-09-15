import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Pencil, TrendingUp } from 'lucide-react'
import { useLocalStorage } from 'usehooks-ts'
import { startOfMonth } from 'date-fns'
import NumberFlow from '@number-flow/react'

export const Route = createFileRoute('/salary')({
  ssr: false,
  component: SalaryPage,
  head: () => ({
    meta: [{ title: 'Salaire — Compteur de revenus en direct' }],
  }),
})

const SECONDS_PER_YEAR = 365.25 * 24 * 3600

const fmtCents = (n: number) =>
  n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })

const EUR_LIVE_FORMAT = {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
} as const

function SalaryPage() {
  const [gross, setGross] = useLocalStorage<number | null>('kash:gross', null)
  const [editing, setEditing] = useState(false)

  const showInput = editing || gross === null || gross <= 0

  return (
    <div className="w-full min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
        {showInput ? (
          <GrossInput
            gross={gross}
            onChange={setGross}
            onSubmit={() => {
              if (gross !== null && gross > 0) setEditing(false)
            }}
          />
        ) : (
          <Counter gross={gross!} onEdit={() => setEditing(true)} />
        )}
      </div>
    </div>
  )
}

function GrossInput({
  gross,
  onChange,
  onSubmit,
}: {
  gross: number | null
  onChange: (n: number | null) => void
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="text-center text-balance mb-2 max-w-xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
          Quel est votre salaire annuel brut&nbsp;?
        </h2>
        <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
          On en déduit combien vous gagnez, chaque seconde, en direct.
        </p>
      </div>
      <div className="flex items-baseline justify-center gap-2 text-5xl md:text-6xl font-medium tabular-nums tracking-tight text-ink">
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={gross === null ? '' : Math.round(gross)}
          min={0}
          step={1000}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value
            if (v === '') {
              onChange(null)
              return
            }
            const n = parseFloat(v)
            onChange(Number.isNaN(n) ? null : n)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
          onBlur={onSubmit}
          className="bg-transparent border-0 outline-none text-center leading-tight caret-clay focus:outline-none placeholder:text-ink-soft/40 field-sizing-content min-w-[1ch] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span aria-hidden="true">€</span>
      </div>
    </div>
  )
}

function Counter({ gross, onEdit }: { gross: number; onEdit: () => void }) {
  const perSecond = gross / SECONDS_PER_YEAR
  const [earned, setEarned] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const monthStart = startOfMonth(new Date()).getTime()
    const tick = () => {
      const elapsedSec = (Date.now() - monthStart) / 1000
      setEarned(elapsedSec * perSecond)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [perSecond])

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 text-ink-muted">
        <TrendingUp size={18} strokeWidth={2} aria-hidden="true" />
        <span className="text-sm font-medium">
          {Math.round(gross).toLocaleString('fr-FR')} € brut / an
        </span>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Modifier le salaire"
          className="text-ink-soft hover:text-ink transition-colors cursor-pointer"
        >
          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <span className="text-6xl md:text-7xl font-medium tabular-nums leading-tight tracking-tight text-clay">
        <NumberFlow value={earned} locales="fr-FR" format={EUR_LIVE_FORMAT} />
      </span>

      <p className="text-ink-muted text-sm md:text-base m-0">
        gagnés depuis le début du mois — soit{' '}
        <strong className="text-ink font-semibold">
          {fmtCents(perSecond)}
        </strong>{' '}
        chaque seconde.
      </p>
    </div>
  )
}
