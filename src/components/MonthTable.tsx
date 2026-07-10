import type { ReactNode } from 'react'
import { DIAS_SEMANA_LETRA, dateStr, daysInMonth, todayStr, weekdayOf } from '../dates'

export interface RowSpec {
  key: string
  label: ReactNode
  cell: (date: string, day: number) => ReactNode
}

export interface TotalSpec {
  label: string
  cell: (date: string) => { text: ReactNode; state: 'ok' | 'bad' | null }
}

interface Props {
  title: string
  subtitle?: string
  year: number
  month: number // 0-based
  rows: RowSpec[]
  total?: TotalSpec
}

export default function MonthTable({ title, subtitle, year, month, rows, total }: Props) {
  const n = daysInMonth(year, month)
  const hoje = todayStr()
  const dias = Array.from({ length: n }, (_, i) => i + 1)

  const cls = (ds: string, extra = '') => `${ds === hoje ? 'today ' : ''}${extra}`.trim()

  return (
    <section className="card">
      <h2>{title}</h2>
      {subtitle && <p className="card-sub">{subtitle}</p>}
      <div className="table-scroll">
        <table className="month-table">
          <thead>
            <tr>
              <th className="rowlabel" />
              {dias.map((d) => {
                const ds = dateStr(year, month, d)
                return (
                  <th key={d} className={cls(ds)}>
                    <span className="wd">{DIAS_SEMANA_LETRA[weekdayOf(year, month, d)]}</span>
                    {d}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th className="rowlabel">{r.label}</th>
                {dias.map((d) => {
                  const ds = dateStr(year, month, d)
                  return (
                    <td key={d} className={cls(ds)}>
                      {r.cell(ds, d)}
                    </td>
                  )
                })}
              </tr>
            ))}
            {total && (
              <tr className="total-row">
                <th className="rowlabel">{total.label}</th>
                {dias.map((d) => {
                  const ds = dateStr(year, month, d)
                  const t = total.cell(ds)
                  return (
                    <td key={d} className={cls(ds, t.state ?? '')}>
                      {t.text}
                    </td>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
