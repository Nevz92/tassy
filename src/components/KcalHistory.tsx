import { useMemo } from 'react'
import type { DayEntry } from '../types'
import { dateStr, daysInMonth, todayStr } from '../dates'
import { parseDay } from '../parser'
import MonthTable from './MonthTable'

interface Props {
  year: number
  month: number
  days: Record<string, DayEntry>
  metaKcal: number
  foodsVersion: number
}

export default function KcalHistory({ year, month, days, metaKcal, foodsVersion }: Props) {
  const hoje = todayStr()
  const kcalPorDia = useMemo(() => {
    const map: Record<string, number> = {}
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const ds = dateStr(year, month, d)
      const texto = days[ds]?.alimentosTexto
      map[ds] = texto?.trim() ? Math.round(parseDay(texto).kcal) : 0
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, days, foodsVersion])

  return (
    <MonthTable
      title="📈 Histórico de calorias"
      subtitle={`Total de kcal por dia — meta: até ${metaKcal}`}
      year={year}
      month={month}
      rows={[]}
      total={{
        label: 'kcal',
        cell: (date) => {
          const v = kcalPorDia[date] ?? 0
          if (!v) return { text: date <= hoje ? '–' : '', state: null }
          return { text: String(v), state: date <= hoje ? (v <= metaKcal ? 'ok' : 'bad') : null }
        },
      }}
    />
  )
}
