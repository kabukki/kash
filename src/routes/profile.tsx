import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useLocalStorage } from 'usehooks-ts'
import { STATUS_LABEL, STATUS_TAGLINE, type Status } from '../lib/taxes'

export const Route = createFileRoute('/profile')({
  ssr: false,
  component: ProfilePage,
  head: () => ({
    meta: [{ title: 'Profil — Vos informations' }],
  }),
})

function ProfilePage() {
  const [gross, setGross] = useLocalStorage<number | null>('gross', null)
  const [status, setStatus] = useLocalStorage<Status | null>('status', null)

  return (
    <div className="w-full min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-center text-balance mb-2 max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
              Pays
            </h2>
            <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
              Seule la France est disponible pour le moment.
            </p>
          </div>
          <div
            aria-disabled="true"
            title="Bientôt disponible"
            className="inline-flex items-center gap-2 py-1.5 pl-2 pr-3 rounded-full bg-cream-surface border border-cream-border shadow-app text-[13px] font-medium tracking-[0.02em] text-ink-soft/60 cursor-not-allowed select-none"
          >
            <span className="text-base leading-none" aria-hidden="true">
              🇫🇷
            </span>
            France
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-center text-balance mb-2 max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
              Quel est votre salaire annuel brut&nbsp;?
            </h2>
            <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
              Renseigné ici, il est réutilisé automatiquement dans tous les
              calculateurs.
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
                  setGross(null)
                  return
                }
                const n = parseFloat(v)
                setGross(Number.isNaN(n) ? null : n)
              }}
              className="bg-transparent border-0 outline-none text-center leading-tight caret-clay focus:outline-none placeholder:text-ink-soft/40 field-sizing-content min-w-[1ch] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span aria-hidden="true">€</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <div className="text-center text-balance mb-2 max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
              Quel est votre statut&nbsp;?
            </h2>
            <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
              Les charges sociales retirées de votre brut dépendent de votre
              statut.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Statut"
            className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
          >
            {(['public', 'etam', 'cadre', 'liberal'] as Status[]).map((s) => {
              const active = status === s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(s)}
                  className={`text-left p-4 rounded-app-lg border transition-all cursor-pointer ${
                    active
                      ? 'bg-cream-surface border-clay shadow-[0_0_0_3px_var(--color-clay-soft)]'
                      : 'bg-cream-surface border-cream-border hover:border-cream-border-strong'
                  }`}
                >
                  <span className="block text-base font-semibold tracking-tight text-ink mb-2">
                    {STATUS_LABEL[s]}
                  </span>
                  <p className="text-xs text-ink-muted leading-snug m-0">
                    {STATUS_TAGLINE[s]}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clay text-cream text-sm font-medium no-underline hover:opacity-90 transition-opacity"
        >
          Comprendre mes impôts et cotisations
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
