import curados from './data/alimentos.json'
import tacoCompleta from './data/taco-completa.json'
import { getCustomFoods, type Food } from './parser'

export interface Suggestion {
  nome: string
  marca?: string
  fonte: 'taco' | 'marca' | 'meus'
  /** por 100 g */
  kcal: number
  p: number
  c: number
  g: number
  /** gramas de 1 unidade típica, quando conhecido */
  un?: number
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const LOCAL: Suggestion[] = [
  ...(curados as Food[]).map((f) => ({ nome: f.n, fonte: 'taco' as const, kcal: f.kcal, p: f.p, c: f.c, g: f.g, un: f.un })),
  ...(tacoCompleta as Food[]).map((f) => ({ nome: f.n, fonte: 'taco' as const, kcal: f.kcal, p: f.p, c: f.c, g: f.g })),
]

const LOCAL_NORM = LOCAL.map((s) => norm(s.nome))

export function searchLocal(query: string, limit = 6): Suggestion[] {
  const q = norm(query.trim())
  if (q.length < 2) return []
  const qTokens = q.split(/\s+/)
  const meus: Suggestion[] = getCustomFoods().map((f) => ({
    nome: f.n,
    fonte: 'meus' as const,
    kcal: f.kcal,
    p: f.p,
    c: f.c,
    g: f.g,
    un: f.un,
  }))
  const candidatos = [...meus, ...LOCAL]
  const candidatosNorm = [...meus.map((s) => norm(s.nome)), ...LOCAL_NORM]
  const scored: { s: Suggestion; score: number }[] = []
  for (let i = 0; i < candidatos.length; i++) {
    const name = candidatosNorm[i]
    // todos os termos digitados precisam aparecer no nome
    if (!qTokens.every((t) => name.includes(t))) continue
    let score = 0
    if (name.startsWith(q)) score += 3
    else if (name.split(/[\s,()-]+/).some((w) => w.startsWith(qTokens[0]))) score += 2
    score += Math.max(0, 1 - name.length / 80) // nomes curtos primeiro
    if (candidatos[i].fonte === 'meus') score += 5 // alimentos da usuária primeiro
    scored.push({ s: candidatos[i], score })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s)
}

interface OffProduct {
  product_name?: string
  product_name_pt?: string
  brands?: string
  nutriments?: Record<string, number | string>
}

const r1 = (v: number) => Math.round(v * 10) / 10

/** busca produtos de marca no Open Food Facts (Brasil) */
export async function searchMarcas(query: string, signal?: AbortSignal, limit = 6): Promise<Suggestion[]> {
  const url =
    'https://br.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1' +
    `&page_size=${limit * 3}&fields=product_name,product_name_pt,brands,nutriments` +
    `&search_terms=${encodeURIComponent(query.trim())}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`OFF ${res.status}`)
  const data = (await res.json()) as { products?: OffProduct[] }
  const out: Suggestion[] = []
  const vistos = new Set<string>()
  for (const prod of data.products ?? []) {
    const nome = (prod.product_name_pt || prod.product_name || '').trim()
    const nutr = prod.nutriments ?? {}
    let kcal = Number(nutr['energy-kcal_100g'])
    if (!Number.isFinite(kcal)) {
      const kj = Number(nutr['energy_100g'])
      if (Number.isFinite(kj)) kcal = kj / 4.184
      else continue
    }
    if (!nome) continue
    const marca = (prod.brands ?? '').split(',')[0].trim() || undefined
    const chave = norm(`${nome}|${marca ?? ''}`)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    out.push({
      nome,
      marca,
      fonte: 'marca',
      kcal: r1(kcal),
      p: r1(Number(nutr['proteins_100g']) || 0),
      c: r1(Number(nutr['carbohydrates_100g']) || 0),
      g: r1(Number(nutr['fat_100g']) || 0),
    })
    if (out.length >= limit) break
  }
  return out
}

/** monta a linha de texto que será adicionada ao bloco do dia */
export function suggestionToLine(s: Suggestion, grams: number): string {
  if (s.fonte === 'taco' || s.fonte === 'meus') return `${grams}g ${s.nome}`
  const f = grams / 100
  const nome = s.marca ? `${s.nome} (${s.marca})` : s.nome
  return `${nome} ${grams}g = ${Math.round(s.kcal * f)}kcal ${r1(s.p * f)}p ${r1(s.c * f)}c ${r1(s.g * f)}g`
}
