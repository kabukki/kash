import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
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

const EUR_LIVE_FORMAT = {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
} as const

function SalaryPage() {
  const [gross] = useLocalStorage<number | null>('gross', null)

  return (
    <div className="w-full min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
        {gross !== null && gross > 0 ? (
          <Counter gross={gross} />
        ) : (
          <MissingGross />
        )}
      </div>
    </div>
  )
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: React.ReactNode
  subtitle: React.ReactNode
}) {
  return (
    <div className="text-center text-balance mb-2 max-w-xl mx-auto">
      <h2 className="font-display text-2xl md:text-3xl leading-tight font-semibold tracking-tight text-ink m-0">
        {title}
      </h2>
      <p className="text-ink-muted text-sm md:text-base m-0 mt-2 leading-snug">
        {subtitle}
      </p>
    </div>
  )
}

function MissingGross() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <SectionHeading
        title="Renseignez votre salaire pour commencer"
        subtitle="Votre salaire annuel brut se renseigne désormais dans votre profil."
      />
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clay text-cream text-sm font-medium no-underline hover:opacity-90 transition-opacity"
      >
        Renseigner mon salaire
      </Link>
    </div>
  )
}

function Counter({ gross }: { gross: number }) {
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
      <SectionHeading
        title="Votre salaire en direct"
        subtitle={
          <>
            Vous gagnez{' '}
            <b>
              {gross.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
            </b>{' '}
            par an, soit{' '}
            <b>
              {perSecond.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}
            </b>{' '}
            par seconde. Voici ce
            que vous avez gagné depuis le début du mois.
          </>
        }
      />
      <span className="text-6xl md:text-7xl font-medium tabular-nums leading-tight tracking-tight text-clay">
        <NumberFlow value={earned} locales="fr-FR" format={EUR_LIVE_FORMAT} />
      </span>
    </div>
  )
}
