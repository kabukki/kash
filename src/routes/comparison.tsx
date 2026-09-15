import { createFileRoute, Link } from '@tanstack/react-router'
import { useLocalStorage } from 'usehooks-ts'
import { Money } from '../components'
import { percentileRank } from '../lib/comparison'
import { STATUS_DEDUCTION, type Status } from '../lib/taxes'

export const Route = createFileRoute('/comparison')({
  ssr: false,
  component: ComparisonPage,
  head: () => ({
    meta: [{ title: 'Comparaison — Votre salaire face aux salariés français' }],
  }),
})

function ComparisonPage() {
  const [gross] = useLocalStorage<number | null>('gross', null)
  const [status] = useLocalStorage<Status | null>('status', null)

  if (gross === null || gross <= 0 || status === null) {
    return (
      <div className="w-full min-h-screen bg-cream py-12 px-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="text-center text-balance mb-2 max-w-xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
              Complétez votre profil pour vous comparer
            </h2>
            <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
              Il nous faut votre salaire annuel brut et votre statut pour vous
              situer parmi les salariés français.
            </p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clay text-cream text-sm font-medium no-underline hover:opacity-90 transition-opacity"
          >
            Compléter mon profil
          </Link>
        </div>
      </div>
    )
  }

  const netMonthly = (gross * (1 - STATUS_DEDUCTION[status])) / 12
  const rank = percentileRank(netMonthly)

  return (
    <div className="w-full min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-8">
        <div className="text-center text-balance max-w-xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
            Où vous vous situez
          </h2>
          <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
            Avec un salaire net mensuel de <b><Money value={netMonthly} /></b>, vous gagnez plus que
          </p>
        </div>

        <span className="text-6xl md:text-7xl font-medium tabular-nums tracking-tight text-clay">
          {Math.round(rank)}&nbsp;%
        </span>
        <p className="text-ink-muted text-sm md:text-base">
          des français
        </p>

        <PositionBar rank={rank} />

        <p className="text-ink-soft text-xs m-0">
          Source : Insee, salaires nets mensuels en EQTP, secteur privé, 2024.
        </p>
      </div>
    </div>
  )
}

function PositionBar({ rank }: { rank: number }) {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative h-3 rounded-full bg-linear-to-r from-rust via-cream-border-strong to-sage">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-5 rounded-full bg-clay border-2 border-cream-surface shadow-app"
          style={{ left: `${rank}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between text-xs text-ink-soft">
        <span>Les moins payés</span>
        <span>Médiane</span>
        <span>Les mieux payés</span>
      </div>
    </div>
  )
}
