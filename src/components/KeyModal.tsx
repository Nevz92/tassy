import { useState } from 'react'
import { getApiKey, setApiKey } from '../ai'

interface Props {
  onClose: () => void
}

export default function KeyModal({ onClose }: Props) {
  const [key, setKey] = useState(getApiKey())

  return (
    <div className="onboarding-backdrop modal-overlay">
      <div className="onboarding card">
        <div className="onb-heart">✨</div>
        <h1>Estimativa por IA</h1>
        <p className="hint">
          Com uma chave da API da Anthropic, alimentos que não estão nas bases são estimados por
          inteligência artificial (centavos por alimento novo — e cada um só é estimado uma vez).
        </p>
        <label>
          Chave da API
          <input
            type="password"
            value={key}
            placeholder="sk-ant-..."
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="hint key-steps">
          Para criar: entre em <b>platform.claude.com</b> → API Keys → Create Key. Adicione um
          crédito pequeno e, em Limits, defina um limite mensal de gasto.
        </p>
        <div className="onb-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setApiKey(key)
              onClose()
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
