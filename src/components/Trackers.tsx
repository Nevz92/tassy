import type { Agua, Cardio, DayEntry, Musculacao } from '../types'
import { CARDIO_LABELS, MUSC_LABELS } from '../types'
import { todayStr } from '../dates'
import MonthTable from './MonthTable'

export interface TrackerProps {
  year: number
  month: number
  getDay: (date: string) => DayEntry
  updateDay: (date: string, patch: Partial<DayEntry>) => void
}

const GARRAFAS: { key: keyof Agua; ml: number; label: string }[] = [
  { key: 'b500', ml: 500, label: '🍼 500 ml' },
  { key: 'b700', ml: 700, label: '🧴 700 ml' },
  { key: 'b900', ml: 900, label: '🍶 900 ml' },
]

export function aguaMl(a: Agua): number {
  return GARRAFAS.reduce((s, g) => s + (a[g.key] ? g.ml : 0), 0)
}

export function aguaMeta(a: Agua): boolean {
  return a.b500 && a.b700 && a.b900
}

export function cardioMin(c: Cardio): number {
  return c.bike + c.escada + c.corrida + c.transport + c.outros
}

export function muscAlgum(m: Musculacao): boolean {
  return m.inferior || m.superior || m.abdominal
}

export function WaterTable({ year, month, getDay, updateDay }: TrackerProps) {
  const hoje = todayStr()
  return (
    <MonthTable
      title="💧 Água"
      subtitle="Marque as garrafas que você bebeu no dia — meta: as 3 (2,1 L)"
      year={year}
      month={month}
      rows={GARRAFAS.map((g) => ({
        key: g.key,
        label: g.label,
        cell: (date) => {
          const on = getDay(date).agua[g.key]
          return (
            <button
              className={`cellbtn ${on ? 'on' : ''}`}
              aria-label={`${g.label} em ${date}`}
              onClick={() => {
                const agua = { ...getDay(date).agua, [g.key]: !on }
                updateDay(date, { agua })
              }}
            >
              {on ? '💧' : ''}
            </button>
          )
        },
      }))}
      total={{
        label: 'Total (L)',
        cell: (date) => {
          const a = getDay(date).agua
          const ml = aguaMl(a)
          const text = ml ? (ml / 1000).toFixed(1).replace('.', ',') : '–'
          if (date > hoje) return { text: ml ? text : '', state: null }
          return { text, state: aguaMeta(a) ? 'ok' : 'bad' }
        },
      }}
    />
  )
}

export function CardioTable({ year, month, getDay, updateDay }: TrackerProps) {
  const hoje = todayStr()
  return (
    <MonthTable
      title="🏃‍♀️ Cardio"
      subtitle="Minutos por dia em cada modalidade — meta: 30 min no total"
      year={year}
      month={month}
      rows={CARDIO_LABELS.map((cLbl) => ({
        key: cLbl.key,
        label: cLbl.label,
        cell: (date) => {
          const v = getDay(date).cardio[cLbl.key]
          return (
            <input
              className="cellinput"
              type="text"
              inputMode="numeric"
              value={v || ''}
              placeholder="·"
              onChange={(e) => {
                const n = Math.max(0, Math.min(999, parseInt(e.target.value, 10) || 0))
                const cardio = { ...getDay(date).cardio, [cLbl.key]: n }
                updateDay(date, { cardio })
              }}
            />
          )
        },
      }))}
      total={{
        label: 'Total (min)',
        cell: (date) => {
          const min = cardioMin(getDay(date).cardio)
          if (date > hoje) return { text: min ? String(min) : '', state: null }
          return { text: min ? String(min) : '0', state: min >= 30 ? 'ok' : 'bad' }
        },
      }}
    />
  )
}

export function StrengthTable({ year, month, getDay, updateDay }: TrackerProps) {
  const hoje = todayStr()
  return (
    <MonthTable
      title="💪 Musculação"
      subtitle="Dê um check no que treinou — o dia fica verde com qualquer treino"
      year={year}
      month={month}
      rows={MUSC_LABELS.map((m) => ({
        key: m.key,
        label: m.label,
        cell: (date) => {
          const on = getDay(date).musculacao[m.key]
          return (
            <button
              className={`cellbtn ${on ? 'on' : ''}`}
              aria-label={`${m.label} em ${date}`}
              onClick={() => {
                const musculacao = { ...getDay(date).musculacao, [m.key]: !on }
                updateDay(date, { musculacao })
              }}
            >
              {on ? '✓' : ''}
            </button>
          )
        },
      }))}
      total={{
        label: 'Treinou?',
        cell: (date) => {
          if (date > hoje) return { text: '', state: null }
          const ok = muscAlgum(getDay(date).musculacao)
          return { text: ok ? '✓' : '✗', state: ok ? 'ok' : 'bad' }
        },
      }}
    />
  )
}

export function MarksTable({ year, month, getDay, updateDay }: TrackerProps) {
  const mkRow = (key: 'intestino' | 'menstruacao', label: string, emoji: string) => ({
    key,
    label,
    cell: (date: string) => {
      const on = getDay(date)[key]
      return (
        <button
          className={`cellbtn ${on ? 'on-plain' : ''}`}
          aria-label={`${label} em ${date}`}
          onClick={() => updateDay(date, { [key]: !on })}
        >
          {on ? emoji : ''}
        </button>
      )
    },
  })
  return (
    <MonthTable
      title="🌸 Corpo"
      subtitle="Toque no dia para marcar"
      year={year}
      month={month}
      rows={[mkRow('intestino', '💩 Intestino', '💩'), mkRow('menstruacao', '🩸 Menstruação', '🩸')]}
    />
  )
}
