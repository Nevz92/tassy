import { useEffect, useRef, type ReactNode } from 'react'
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
  const scrollRef = useRef<HTMLDivElement>(null)

  // ao abrir/trocar de mês, posiciona o scroll com o dia de hoje como primeira coluna visível
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const todayTh = el.querySelector<HTMLElement>('thead th.today')
    const labelTh = el.querySelector<HTMLElement>('thead th.rowlabel')
    if (todayTh) el.scrollLeft = Math.max(0, todayTh.offsetLeft - (labelTh?.offsetWidth ?? 0))
    else el.scrollLeft = 0
  }, [year, month])

  const cls = (ds: string, extra = '') => `${ds === hoje ? 'today ' : ''}${extra}`.trim()

  return (
    <section className="card">
      <h2>{title}</h2>
      {subtitle && <p className="card-sub">{subtitle}</p>}
      <div className="table-scroll" ref={scrollRef}>
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
