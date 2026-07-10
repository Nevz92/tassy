import { useMemo } from 'react'
import { parseDay } from '../parser'

interface Props {
  texto: string
  metaKcal: number
  titulo?: string
  foodsVersion?: number
}

export const fmt = (n: number) => String(Math.round(n))

export default function MacroSummary({ texto, metaKcal, titulo, foodsVersion }: Props) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const m = useMemo(() => parseDay(texto), [texto, foodsVersion])
  const kcalP = m.p * 4
  const kcalC = m.c * 4
  const kcalG = m.g * 9
  const totalMacroKcal = kcalP + kcalC + kcalG
  const pct = (v: number) => (totalMacroKcal ? Math.round((v / totalMacroKcal) * 100) : 0)

  return (
    <section className="card">
      <h2>{titulo ?? '🍽️ Macros de hoje'}</h2>
      {m.lines.length === 0 ? (
        <p className="hint">Nenhum alimento registrado — anote na aba Alimentação 🍓</p>
      ) : (
        <>
          <div className="macro-kcal-row">
            <span className={`kcal-big ${m.kcal <= metaKcal ? 'ok-text' : 'bad-text'}`}>
              {fmt(m.kcal)} <small>kcal</small>
            </span>
            <span className="hint">meta: até {metaKcal} kcal</span>
          </div>
          {totalMacroKcal > 0 && (
            <div className="macro-bar" role="img" aria-label="Divisão de macros">
              <span className="seg-p" style={{ width: `${pct(kcalP)}%` }} />
              <span className="seg-c" style={{ width: `${pct(kcalC)}%` }} />
              <span className="seg-g" style={{ width: `${pct(kcalG)}%` }} />
            </div>
          )}
          <div className="macro-legend">
            <span>
              <i className="dot dot-p" /> Proteína <b>{fmt(m.p)}g</b> ({pct(kcalP)}%)
            </span>
            <span>
              <i className="dot dot-c" /> Carbo <b>{fmt(m.c)}g</b> ({pct(kcalC)}%)
            </span>
            <span>
              <i className="dot dot-g" /> Gordura <b>{fmt(m.g)}g</b> ({pct(kcalG)}%)
            </span>
          </div>
        </>
      )}
    </section>
  )
}
