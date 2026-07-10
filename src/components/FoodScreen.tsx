import { useEffect, useMemo, useRef, useState } from 'react'
import type { DayEntry } from '../types'
import { dateStr, daysInMonth, shortLabel, todayStr } from '../dates'
import { addPhoto, deletePhoto, photosOfMonth } from '../db'
import { parseDay, type Food } from '../parser'
import { estimarAlimento } from '../ai'
import type { Suggestion } from '../foodSearch'
import { fmt } from './MacroSummary'
import FoodAdder from './FoodAdder'

interface Props {
  year: number
  month: number
  getDay: (date: string) => DayEntry
  updateDay: (date: string, patch: Partial<DayEntry>) => void
  metaKcal: number
  /** salva um alimento estimado por IA em "meus alimentos" */
  onNewFood: (f: Food) => Promise<void>
  /** muda quando "meus alimentos" muda — força reparse dos blocos */
  foodsVersion: number
}

interface PhotoView {
  id: string
  date: string
  url: string
}

async function resizeImage(file: File, maxDim = 1000): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha ao processar imagem'))), 'image/jpeg', 0.82)
  )
}

function DayCard({
  date,
  entry,
  metaKcal,
  photos,
  onText,
  onAddPhoto,
  onOpenPhoto,
  highlight,
  estimar,
  foodsVersion,
}: {
  date: string
  entry: DayEntry
  metaKcal: number
  photos: PhotoView[]
  onText: (v: string) => void
  onAddPhoto: (f: File) => void
  onOpenPhoto: (p: PhotoView) => void
  highlight: boolean
  estimar: (texto: string) => Promise<Suggestion | null>
  foodsVersion: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [estimandoLinha, setEstimandoLinha] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const macros = useMemo(() => parseDay(entry.alimentosTexto), [entry.alimentosTexto, foodsVersion])
  const naoReconhecidas = macros.lines.filter((l) => !l.ok)
  const temAlgo = macros.lines.length > 0

  const estimarLinha = async (raw: string) => {
    setEstimandoLinha(raw)
    try {
      const s = await estimar(raw)
      if (!s) alert(`Não reconheci "${raw}" como um alimento 🤔`)
    } catch {
      alert('Não consegui estimar — confira a chave de IA (botão ✨ IA no rodapé) e a internet.')
    }
    setEstimandoLinha(null)
  }

  return (
    <article className={`food-card ${highlight ? 'today-card' : ''}`} data-date={date}>
      <header>
        <span className="food-date">{shortLabel(date)}</span>
        {highlight && <span className="badge-hoje">hoje 💕</span>}
        {temAlgo && (
          <span className={`kcal-chip ${macros.kcal <= metaKcal ? 'ok' : 'bad'}`}>{fmt(macros.kcal)} kcal</span>
        )}
      </header>
      <FoodAdder
        onAdd={(line) => onText(entry.alimentosTexto.trim() ? `${entry.alimentosTexto.replace(/\n$/, '')}\n${line}` : line)}
        estimar={estimar}
      />
      <textarea
        value={entry.alimentosTexto}
        placeholder={'Escreva um alimento por linha 🍓\nex.: 100g arroz\n2 ovos mexidos\n1 banana'}
        rows={Math.max(3, entry.alimentosTexto.split('\n').length + 1)}
        onChange={(e) => onText(e.target.value)}
      />
      {temAlgo && (
        <div className="food-macros">
          <span>P <b>{fmt(macros.p)}g</b></span>
          <span>C <b>{fmt(macros.c)}g</b></span>
          <span>G <b>{fmt(macros.g)}g</b></span>
        </div>
      )}
      {naoReconhecidas.length > 0 && (
        <div className="food-warn">
          {naoReconhecidas.map((l) => (
            <div key={l.raw} className="warn-line">
              ⚠️ "{l.raw}"
              <button
                className="btn-ai-line"
                disabled={estimandoLinha !== null}
                onClick={() => estimarLinha(l.raw)}
              >
                {estimandoLinha === l.raw ? '✨ estimando…' : '✨ estimar com IA'}
              </button>
            </div>
          ))}
          <p className="warn-help">
            Ou reescreva, ou informe manualmente: <code>nome = 300kcal 10p 30c 5g</code>
          </p>
        </div>
      )}
      <div className="food-photos">
        {photos.map((p) => (
          <button key={p.id} className="thumb" onClick={() => onOpenPhoto(p)}>
            <img src={p.url} alt="Foto da refeição" />
          </button>
        ))}
        <button className="thumb add" onClick={() => fileRef.current?.click()} aria-label="Adicionar foto">
          📷
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onAddPhoto(f)
            e.target.value = ''
          }}
        />
      </div>
    </article>
  )
}

export default function FoodScreen({ year, month, getDay, updateDay, metaKcal, onNewFood, foodsVersion }: Props) {
  const [photos, setPhotos] = useState<PhotoView[]>([])
  const [viewer, setViewer] = useState<PhotoView | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const hoje = todayStr()
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    let urls: string[] = []
    photosOfMonth(prefix).then((recs) => {
      const views = recs.map((r) => ({ id: r.id, date: r.date, url: URL.createObjectURL(r.blob) }))
      urls = views.map((v) => v.url)
      setPhotos(views)
    })
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      setPhotos([])
    }
  }, [prefix])

  useEffect(() => {
    if (!hoje.startsWith(prefix)) return
    const el = listRef.current?.querySelector(`[data-date="${hoje}"]`)
    el?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [prefix, hoje])

  const dias = Array.from({ length: daysInMonth(year, month) }, (_, i) => dateStr(year, month, i + 1))

  const handleAddPhoto = async (date: string, file: File) => {
    try {
      const blob = await resizeImage(file)
      const rec = await addPhoto(date, blob)
      setPhotos((prev) => [...prev, { id: rec.id, date, url: URL.createObjectURL(blob) }])
    } catch {
      alert('Não consegui salvar a foto 😢 — tente outra imagem.')
    }
  }

  const estimar = async (texto: string): Promise<Suggestion | null> => {
    const f = await estimarAlimento(texto)
    if (!f) return null
    await onNewFood(f)
    return { nome: f.n, fonte: 'meus', kcal: f.kcal, p: f.p, c: f.c, g: f.g, un: f.un }
  }

  const handleDeletePhoto = async (p: PhotoView) => {
    await deletePhoto(p.id)
    URL.revokeObjectURL(p.url)
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
    setViewer(null)
  }

  return (
    <div className="food-screen" ref={listRef}>
      <p className="hint food-hint">
        Anote o que comeu em cada dia, uma linha por alimento — eu calculo as calorias e macros para você 💕
      </p>
      {dias.map((date) => (
        <DayCard
          key={date}
          date={date}
          entry={getDay(date)}
          metaKcal={metaKcal}
          photos={photos.filter((p) => p.date === date)}
          onText={(v) => updateDay(date, { alimentosTexto: v })}
          onAddPhoto={(f) => handleAddPhoto(date, f)}
          onOpenPhoto={setViewer}
          highlight={date === hoje}
          estimar={estimar}
          foodsVersion={foodsVersion}
        />
      ))}
      {viewer && (
        <div className="photo-viewer" onClick={() => setViewer(null)}>
          <img src={viewer.url} alt="Foto da refeição" onClick={(e) => e.stopPropagation()} />
          <div className="viewer-actions">
            <button
              className="btn danger"
              onClick={() => {
                if (confirm('Excluir esta foto?')) handleDeletePhoto(viewer)
              }}
            >
              🗑️ Excluir
            </button>
            <button className="btn ghost" onClick={() => setViewer(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
