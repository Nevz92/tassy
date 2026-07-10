import { useState, type FormEvent } from 'react'
import type { Profile } from '../types'

interface Props {
  initial?: Profile
  onSave: (p: Profile) => void
  onCancel?: () => void
}

export default function Onboarding({ initial, onSave, onCancel }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [nascimento, setNascimento] = useState(initial?.nascimento ?? '')
  const [altura, setAltura] = useState(initial?.alturaCm ? String(initial.alturaCm) : '')
  const [peso, setPeso] = useState(initial?.pesoInicial ? String(initial.pesoInicial) : '')
  const [meta, setMeta] = useState(String(initial?.metaKcal ?? 1500))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave({
      nome: nome.trim(),
      nascimento: nascimento || undefined,
      alturaCm: altura ? parseFloat(altura) : undefined,
      pesoInicial: peso ? parseFloat(peso) : undefined,
      metaKcal: parseInt(meta, 10) || 1500,
    })
  }

  return (
    <div className="onboarding-backdrop">
      <form className="onboarding card" onSubmit={submit}>
        <div className="onb-heart">💖</div>
        <h1>{initial ? 'Seu perfil' : 'Bem-vinda ao Tassy!'}</h1>
        {!initial && <p className="hint">Vamos nos conhecer? Me conta um pouquinho sobre você 🌸</p>}
        <label>
          Seu nome *
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você se chama?" required />
        </label>
        <label>
          Data de nascimento
          <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
        </label>
        <div className="onb-row">
          <label>
            Altura (cm)
            <input type="number" min="100" max="230" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="165" />
          </label>
          <label>
            Peso atual (kg)
            <input type="number" step="0.1" min="20" max="300" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="60,0" />
          </label>
        </div>
        <label>
          Meta diária de calorias (kcal)
          <input type="number" min="500" max="6000" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </label>
        <div className="onb-actions">
          {onCancel && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn primary">
            {initial ? 'Salvar' : 'Começar 💪'}
          </button>
        </div>
      </form>
    </div>
  )
}
