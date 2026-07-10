import { useMemo } from 'react'
import type { DayEntry } from '../types'
import { addDays, dateStr, daysInMonth, todayStr, weekStartOf } from '../dates'
import { parseDay } from '../parser'
import { aguaMeta, cardioMin, muscAlgum } from './Trackers'

interface Props {
  year: number
  month: number
  days: Record<string, DayEntry>
  weights: Record<string, number>
}

interface Stats {
  aguaDias: number
  cardioTotal: number
  muscDias: number
  kcalMedia: number | null
}

/** "60 min (1h)" · "210 min (3h30)" · "45 min" */
export function fmtMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${min} min (${h}h${m ? String(m).padStart(2, '0') : ''})`
}

function statsOf(dates: string[], days: Record<string, DayEntry>): Stats {
  const hoje = todayStr()
  const past = dates.filter((d) => d <= hoje)
  let aguaDias = 0
  let cardioTotal = 0
  let muscDias = 0
  let kcalSum = 0
  let kcalDias = 0
  for (const ds of past) {
    const d = days[ds]
    if (!d) continue
    if (aguaMeta(d.agua)) aguaDias++
    cardioTotal += cardioMin(d.cardio)
    if (muscAlgum(d.musculacao)) muscDias++
    if (d.alimentosTexto.trim()) {
      kcalSum += parseDay(d.alimentosTexto).kcal
      kcalDias++
    }
  }
  return { aguaDias, cardioTotal, muscDias, kcalMedia: kcalDias ? kcalSum / kcalDias : null }
}

function streakAtivo(days: Record<string, DayEntry>): number {
  const ativo = (ds: string) => {
    const d = days[ds]
    return !!d && (cardioMin(d.cardio) >= 30 || muscAlgum(d.musculacao))
  }
  let cursor = todayStr()
  if (!ativo(cursor)) cursor = addDays(cursor, -1) // hoje ainda pode estar em andamento
  let n = 0
  while (ativo(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

interface Row {
  label: string
  value: string
  ok?: boolean
}

function StatCard({ titulo, rows }: { titulo: string; rows: Row[] }) {
  return (
    <div className="stat-card">
      <h3>{titulo}</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.label}>
            {r.label} <b className={r.ok ? 'ok-text' : ''}>{r.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SummaryCards({ year, month, days, weights }: Props) {
  const { semana, mes, streak, pesoVar } = useMemo(() => {
    const ws = weekStartOf(new Date())
    const semanaDates = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    const n = daysInMonth(year, month)
    const mesDates = Array.from({ length: n }, (_, i) => dateStr(year, month, i + 1))

    const mesPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const pesosMes = Object.entries(weights)
      .filter(([k]) => k.startsWith(mesPrefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
    const pesoVar = pesosMes.length >= 2 ? pesosMes[pesosMes.length - 1] - pesosMes[0] : null

    return {
      semana: statsOf(semanaDates, days),
      mes: statsOf(mesDates, days),
      streak: streakAtivo(days),
      pesoVar,
    }
  }, [year, month, days, weights])

  const kcalStr = (s: Stats) => (s.kcalMedia === null ? '—' : `${Math.round(s.kcalMedia)} kcal`)
  const pesoStr =
    pesoVar === null ? '—' : `${pesoVar > 0 ? '+' : ''}${pesoVar.toFixed(1).replace('.', ',')} kg`

  const semanaRows: Row[] = [
    { label: '💧 Água', value: `${semana.aguaDias}/7 dias`, ok: semana.aguaDias >= 7 },
    {
      label: '🏃‍♀️ Cardio (meta 210 min)',
      value: fmtMin(semana.cardioTotal),
      ok: semana.cardioTotal >= 210,
    },
    { label: '💪 Musculação', value: `${semana.muscDias}/5 dias`, ok: semana.muscDias >= 5 },
    { label: '🍽️ Média', value: kcalStr(semana) },
    { label: '🔥 Sequência', value: `${streak} dia${streak === 1 ? '' : 's'}` },
  ]

  const mesRows: Row[] = [
    { label: '💧 Água', value: `${mes.aguaDias}/30 dias`, ok: mes.aguaDias >= 30 },
    { label: '🏃‍♀️ Cardio', value: fmtMin(mes.cardioTotal) },
    { label: '💪 Musculação', value: `${mes.muscDias} dias` },
    { label: '🍽️ Média', value: kcalStr(mes) },
    { label: '⚖️ Peso no mês', value: pesoStr },
  ]

  return (
    <section className="summary-row">
      <StatCard titulo="✨ Semana atual" rows={semanaRows} />
      <StatCard titulo="🗓️ Mês" rows={mesRows} />
    </section>
  )
}
