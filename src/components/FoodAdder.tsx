import { useEffect, useRef, useState } from 'react'
import { searchLocal, searchMarcas, suggestionToLine, type Suggestion } from '../foodSearch'

interface Props {
  onAdd: (line: string) => void
  /** estima um alimento desconhecido via IA e o salva em "meus alimentos" */
  estimar: (texto: string) => Promise<Suggestion | null>
}

export default function FoodAdder({ onAdd, estimar }: Props) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Suggestion | null>(null)
  const [grams, setGrams] = useState('')
  const [sugs, setSugs] = useState<Suggestion[]>([])
  const [buscandoMarcas, setBuscandoMarcas] = useState(false)
  const [estimando, setEstimando] = useState(false)
  const [aiInfo, setAiInfo] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const gramsRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sel || q.trim().length < 2) {
      setSugs([])
      setOpen(false)
      return
    }
    setSugs(searchLocal(q))
    setOpen(true)
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoMarcas(true)
      try {
        const marcas = await searchMarcas(q, ctl.signal)
        setSugs((prev) => [...prev.filter((s) => s.fonte === 'taco'), ...marcas])
      } catch {
        // offline ou API indisponível: segue só com a base local
      }
      setBuscandoMarcas(false)
    }, 500)
    return () => {
      clearTimeout(t)
      ctl.abort()
      setBuscandoMarcas(false)
    }
  }, [q, sel])

  // fecha o dropdown ao tocar fora
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const estimarComIA = async () => {
    if (!q.trim() || estimando) return
    setEstimando(true)
    try {
      const s = await estimar(q.trim())
      if (s) {
        escolher(s)
        const porcao = s.un ? ` · porção de ${s.un}g ≈ ${Math.round((s.kcal * s.un) / 100)} kcal` : ''
        setAiInfo(`✨ ${s.nome}: ${Math.round(s.kcal)} kcal/100g${porcao}`)
      } else {
        alert('Não reconheci isso como um alimento 🤔 — tente descrever de outro jeito.')
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('não configurada')) {
        alert('Configure a chave de IA no botão ✨ IA, no rodapé do app.')
      } else {
        alert('Não consegui estimar agora 😢 — verifique a internet e a chave de IA.')
      }
    }
    setEstimando(false)
  }

  const escolher = (s: Suggestion) => {
    setSel(s)
    setQ(s.marca ? `${s.nome} (${s.marca})` : s.nome)
    setGrams(String(s.un ?? 100))
    setOpen(false)
    gramsRef.current?.focus()
    gramsRef.current?.select()
  }

  const adicionar = () => {
    const gr = Math.max(1, parseFloat(grams.replace(',', '.')) || 0)
    if (sel && gr) {
      onAdd(suggestionToLine(sel, gr))
    } else if (q.trim()) {
      onAdd(gr > 1 || grams ? `${gr}g ${q.trim()}` : q.trim())
    } else {
      return
    }
    setQ('')
    setSel(null)
    setGrams('')
    setSugs([])
    setAiInfo(null)
  }

  return (
    <div className="food-adder" ref={rootRef}>
      <div className="adder-row">
        <input
          className="adder-query"
          value={q}
          placeholder="🔍 buscar alimento ou marca…"
          onChange={(e) => {
            setQ(e.target.value)
            setSel(null)
            setAiInfo(null)
          }}
          onFocus={() => sugs.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (open && sugs.length) escolher(sugs[0])
              else adicionar()
            }
          }}
        />
        <input
          ref={gramsRef}
          className="adder-grams"
          type="text"
          inputMode="decimal"
          value={grams}
          placeholder="g"
          onChange={(e) => setGrams(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
        />
        <button className="adder-btn" onClick={adicionar} aria-label="Adicionar alimento">
          +
        </button>
      </div>
      {aiInfo && <p className="ai-info">{aiInfo}</p>}
      {open && (sugs.length > 0 || buscandoMarcas) && (
        <ul className="sug-list">
          {sugs.map((s, i) => (
            <li key={`${s.fonte}-${s.nome}-${s.marca ?? ''}-${i}`}>
              <button onClick={() => escolher(s)}>
                <span className="sug-nome">
                  {s.nome}
                  {s.marca && <span className="sug-marca">{s.marca}</span>}
                </span>
                <span className="sug-info">
                  {s.fonte === 'taco' ? '📗' : '🏷️'} {Math.round(s.kcal)} kcal/100g
                </span>
              </button>
            </li>
          ))}
          {buscandoMarcas && <li className="sug-loading">🏷️ buscando marcas…</li>}
          {!buscandoMarcas && (
            <li>
              <button className="sug-ai" onClick={estimarComIA} disabled={estimando}>
                {estimando ? '✨ estimando…' : `✨ Estimar "${q.trim()}" com IA`}
              </button>
            </li>
          )}
        </ul>
      )}
      {open && sugs.length === 0 && !buscandoMarcas && q.trim().length >= 2 && (
        <ul className="sug-list">
          <li>
            <button className="sug-ai" onClick={estimarComIA} disabled={estimando}>
              {estimando ? '✨ estimando…' : `✨ Estimar "${q.trim()}" com IA`}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
