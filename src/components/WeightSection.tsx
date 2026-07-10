import { addDays, dateStr, daysInMonth, parseDate, weekStartOf } from '../dates'

interface Props {
  year: number
  month: number
  weights: Record<string, number>
  setWeight: (weekStart: string, kg: number | null) => void
}

const fmtDM = (ds: string) => {
  const d = parseDate(ds)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** segundas-feiras das semanas que tocam o mês */
function weeksOfMonth(year: number, month: number): string[] {
  const out: string[] = []
  let ws = weekStartOf(parseDate(dateStr(year, month, 1)))
  const last = dateStr(year, month, daysInMonth(year, month))
  while (ws <= last) {
    out.push(ws)
    ws = addDays(ws, 7)
  }
  return out
}

function Chart({ weights }: { weights: Record<string, number> }) {
  const entries = Object.entries(weights)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
  if (entries.length < 2) {
    return <p className="hint">Registre o peso em pelo menos 2 semanas para ver o gráfico 📈</p>
  }
  const vals = entries.map(([, v]) => v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = Math.max((max - min) * 0.15, 0.5)
  const lo = min - pad
  const hi = max + pad
  const W = 320
  const H = 110
  const x = (i: number) => 14 + (i * (W - 28)) / (entries.length - 1)
  const y = (v: number) => H - 18 - ((v - lo) * (H - 36)) / (hi - lo)
  const pts = entries.map(([, v], i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução do peso">
      <polyline points={pts} fill="none" stroke="var(--pink)" strokeWidth="2.5" strokeLinecap="round" />
      {entries.map(([ws, v], i) => (
        <g key={ws}>
          <circle cx={x(i)} cy={y(v)} r="3.5" fill="var(--pink)" />
          {(i === 0 || i === entries.length - 1 || v === min || v === max) && (
            <text x={x(i)} y={y(v) - 8} textAnchor="middle" className="chart-label">
              {v.toFixed(1).replace('.', ',')}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function WeightSection({ year, month, weights, setWeight }: Props) {
  const semanas = weeksOfMonth(year, month)
  return (
    <section className="card">
      <h2>⚖️ Peso semanal</h2>
      <p className="card-sub">Registre seu peso uma vez por semana</p>
      <div className="weight-weeks">
        {semanas.map((ws, i) => (
          <label key={ws} className="weight-week">
            <span>
              Sem {i + 1} <small>({fmtDM(ws)} – {fmtDM(addDays(ws, 6))})</small>
            </span>
            <span className="weight-input">
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="—"
                value={weights[ws] ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setWeight(ws, v === '' ? null : parseFloat(v))
                }}
              />
              kg
            </span>
          </label>
        ))}
      </div>
      <Chart weights={weights} />
    </section>
  )
}
