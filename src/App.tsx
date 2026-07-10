import { useCallback, useEffect, useRef, useState } from 'react'
import type { DayEntry, Profile } from './types'
import { emptyDay } from './types'
import { MESES, todayStr } from './dates'
import {
  exportBackup,
  importBackup,
  loadAllDays,
  loadAllWeights,
  loadMyFoods,
  loadProfile,
  saveDay,
  saveMyFood,
  saveProfile,
  saveWeight,
  type Backup,
} from './db'
import { getCustomFoods, setCustomFoods, type Food } from './parser'
import { FRASES } from './data/frases'
import KeyModal from './components/KeyModal'
import SummaryCards from './components/SummaryCards'
import { CardioTable, MarksTable, StrengthTable, WaterTable } from './components/Trackers'
import WeightSection from './components/WeightSection'
import MacroSummary from './components/MacroSummary'
import FoodScreen from './components/FoodScreen'
import Onboarding from './components/Onboarding'

type Screen = 'principal' | 'alimentacao'

function pickFrase(): string {
  let usadas: number[] = []
  try {
    usadas = JSON.parse(localStorage.getItem('tassy-frases') ?? '[]')
  } catch {
    usadas = []
  }
  let livres = FRASES.map((_, i) => i).filter((i) => !usadas.includes(i))
  if (livres.length === 0) {
    usadas = []
    livres = FRASES.map((_, i) => i)
  }
  const idx = livres[Math.floor(Math.random() * livres.length)]
  localStorage.setItem('tassy-frases', JSON.stringify([...usadas, idx]))
  return FRASES[idx]
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [editingProfile, setEditingProfile] = useState(false)
  const [days, setDays] = useState<Record<string, DayEntry>>({})
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [screen, setScreen] = useState<Screen>('principal')
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [frase] = useState(pickFrase)
  const [foodsVersion, setFoodsVersion] = useState(0)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const [p, d, w, mf] = await Promise.all([
        loadProfile(),
        loadAllDays(),
        loadAllWeights(),
        loadMyFoods(),
      ])
      setDays(d)
      setWeights(w)
      setCustomFoods(mf)
      setFoodsVersion((v) => v + 1)
      setProfile(p ?? null)
    })()
  }, [])

  const handleNewFood = useCallback(async (f: Food) => {
    await saveMyFood(f)
    setCustomFoods([f, ...getCustomFoods().filter((x) => x.n !== f.n)])
    setFoodsVersion((v) => v + 1)
  }, [])

  const getDay = useCallback((date: string) => days[date] ?? emptyDay(date), [days])

  const updateDay = useCallback((date: string, patch: Partial<DayEntry>) => {
    setDays((prev) => {
      const next: DayEntry = { ...(prev[date] ?? emptyDay(date)), ...patch, date }
      saveDay(next)
      return { ...prev, [date]: next }
    })
  }, [])

  const setWeight = useCallback((weekStart: string, kg: number | null) => {
    setWeights((prev) => {
      const next = { ...prev }
      if (kg === null || Number.isNaN(kg)) delete next[weekStart]
      else next[weekStart] = kg
      return next
    })
    void saveWeight(weekStart, kg !== null && Number.isNaN(kg) ? null : kg)
  }, [])

  const handleSaveProfile = async (p: Profile) => {
    await saveProfile(p)
    setProfile(p)
    setEditingProfile(false)
  }

  const handleExport = async () => {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tassy-backup-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleImport = async (file: File) => {
    try {
      const b = JSON.parse(await file.text()) as Backup
      if (b.app !== 'tassy') throw new Error('arquivo inválido')
      if (!confirm('Importar este backup? Os dados dele serão mesclados aos atuais.')) return
      await importBackup(b)
      const [p, d, w] = await Promise.all([loadProfile(), loadAllDays(), loadAllWeights()])
      setDays(d)
      setWeights(w)
      setProfile(p ?? null)
      alert('Backup importado com sucesso! 💖')
    } catch {
      alert('Não consegui ler esse arquivo de backup 😢')
    }
  }

  if (profile === undefined) {
    return <div className="loading">💖 carregando…</div>
  }
  if (profile === null || editingProfile) {
    return (
      <Onboarding
        initial={editingProfile ? profile ?? undefined : undefined}
        onSave={handleSaveProfile}
        onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
      />
    )
  }

  const { y, m } = ym
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth()
  const prevMonth = () => setYm(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
  const nextMonth = () => setYm(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })
  const hoje = todayStr()
  const trackerProps = { year: y, month: m, getDay, updateDay }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Tassy 💖</h1>
          <span className="hello">oi, {profile.nome.split(' ')[0]}!</span>
        </div>
        <div className="banner">✨ {frase}</div>
        <nav className="tabs">
          <button className={screen === 'principal' ? 'active' : ''} onClick={() => setScreen('principal')}>
            📋 Principal
          </button>
          <button className={screen === 'alimentacao' ? 'active' : ''} onClick={() => setScreen('alimentacao')}>
            🍽️ Alimentação
          </button>
        </nav>
        <div className="monthnav">
          <button onClick={prevMonth} aria-label="Mês anterior">‹</button>
          <span className="monthname">
            {MESES[m]} de {y}
          </span>
          <button onClick={nextMonth} aria-label="Próximo mês">›</button>
          {!isCurrentMonth && (
            <button className="btn-hoje" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>
              hoje
            </button>
          )}
        </div>
      </header>

      {screen === 'principal' ? (
        <main>
          <SummaryCards year={y} month={m} days={days} weights={weights} />
          <MacroSummary
            texto={getDay(hoje).alimentosTexto}
            metaKcal={profile.metaKcal}
            foodsVersion={foodsVersion}
          />
          <WaterTable {...trackerProps} />
          <CardioTable {...trackerProps} />
          <StrengthTable {...trackerProps} />
          <MarksTable {...trackerProps} />
          <WeightSection year={y} month={m} weights={weights} setWeight={setWeight} />
        </main>
      ) : (
        <main>
          <FoodScreen
            year={y}
            month={m}
            getDay={getDay}
            updateDay={updateDay}
            metaKcal={profile.metaKcal}
            onNewFood={handleNewFood}
            foodsVersion={foodsVersion}
          />
        </main>
      )}

      {showKeyModal && <KeyModal onClose={() => setShowKeyModal(false)} />}

      <footer className="appfooter">
        <button className="btn ghost" onClick={() => setEditingProfile(true)}>
          ✏️ Perfil
        </button>
        <button className="btn ghost" onClick={() => setShowKeyModal(true)}>
          ✨ IA
        </button>
        <button className="btn ghost" onClick={handleExport}>
          ⬇️ Backup
        </button>
        <button className="btn ghost" onClick={() => importRef.current?.click()}>
          ⬆️ Importar
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImport(f)
            e.target.value = ''
          }}
        />
      </footer>
    </div>
  )
}
