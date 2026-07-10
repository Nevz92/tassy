import alimentosJson from './data/alimentos.json'
import tacoCompleta from './data/taco-completa.json'

export interface Food {
  n: string
  kcal: number
  p: number
  c: number
  g: number
  /** gramas de 1 unidade típica (1 banana, 1 fatia...) */
  un?: number
}

export interface ParsedLine {
  raw: string
  ok: boolean
  food?: string
  grams?: number
  kcal: number
  p: number
  c: number
  g: number
}

export interface DayMacros {
  kcal: number
  p: number
  c: number
  g: number
  lines: ParsedLine[]
}

// lista curada primeiro: em empate de pontuação, ela vence (nomes mais comuns e pesos por unidade)
const FOODS = [...(alimentosJson as Food[]), ...(tacoCompleta as Food[])]

// alimentos salvos pela usuária (estimados por IA) — prioridade máxima na busca
let CUSTOM_FOODS: Food[] = []

export function setCustomFoods(foods: Food[]) {
  CUSTOM_FOODS = foods
}

export function getCustomFoods(): Food[] {
  return CUSTOM_FOODS
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const FILLER = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'um', 'uma', 'no', 'na'])

/** medidas caseiras -> gramas aproximadas ('un' = usa o peso da unidade do alimento) */
const MEDIDAS: Record<string, number | 'un'> = {
  fatia: 'un',
  fatias: 'un',
  unidade: 'un',
  unidades: 'un',
  un: 'un',
  pedaco: 'un',
  pedacos: 'un',
  copo: 200,
  copos: 200,
  xicara: 150,
  xicaras: 150,
  colher: 20,
  colheres: 20,
  concha: 140,
  conchas: 140,
  prato: 300,
  pratos: 300,
  bola: 60,
  bolas: 60,
  scoop: 30,
  scoops: 30,
  dose: 30,
  doses: 30,
  lata: 350,
  latas: 350,
  pote: 170,
  potes: 170,
  punhado: 30,
  punhados: 30,
}

const numVal = (s: string) => parseFloat(s.replace(',', '.'))

function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (b.length >= 3 && a.startsWith(b)) return true
  if (a.length >= 3 && b.startsWith(a)) return true
  return false
}

const foodTokens = (f: Food) => norm(f.n).split(/[\s,()-]+/).filter((t) => t && !FILLER.has(t))

function matchFood(tokens: string[]): Food | undefined {
  if (!tokens.length) return undefined
  let best: Food | undefined
  let bestScore = 0
  for (const f of [...CUSTOM_FOODS, ...FOODS]) {
    const fts = foodTokens(f)
    let allMatch = true
    for (const t of tokens) {
      if (!fts.some((ft) => tokenMatch(ft, t))) {
        allMatch = false
        break
      }
    }
    if (!allMatch) continue
    // prefere nomes mais "cobertos" pelos tokens digitados; empate fica com o primeiro (mais comum)
    const score = tokens.length / fts.length
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }
  return best
}

/** linha manual: "pastel = 300kcal 8p 30c 15g" */
function parseManual(raw: string): ParsedLine | undefined {
  const eq = raw.indexOf('=')
  if (eq < 0) return undefined
  const right = norm(raw.slice(eq + 1))
  const re = /(\d+(?:[.,]\d+)?)\s*(kcal|cal|prot|p|carb|c|gord|g)\b/g
  let m: RegExpExecArray | null
  let found = false
  const out = { kcal: 0, p: 0, c: 0, g: 0 }
  while ((m = re.exec(right))) {
    found = true
    const v = numVal(m[1])
    const u = m[2]
    if (u === 'kcal' || u === 'cal') out.kcal = v
    else if (u === 'p' || u === 'prot') out.p = v
    else if (u === 'c' || u === 'carb') out.c = v
    else out.g = v
  }
  if (!found) return undefined
  if (!out.kcal) out.kcal = out.p * 4 + out.c * 4 + out.g * 9
  return { raw, ok: true, food: raw.slice(0, eq).trim(), ...out }
}

export function parseLine(raw: string): ParsedLine | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const manual = parseManual(trimmed)
  if (manual) return manual

  const text = norm(trimmed)
  const words = text.split(/\s+/)

  let qty: number | undefined
  let grams: number | undefined
  let medida: number | 'un' | undefined
  const nameTokens: string[] = []

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    // número colado na unidade: "100g", "200ml", "1,5l"
    const nm = /^(\d+(?:[.,]\d+)?)(g|gr|gramas?|ml|kg|l|litros?)?$/.exec(w)
    if (nm && qty === undefined) {
      qty = numVal(nm[1])
      const unit = nm[2]
      if (unit === 'g' || unit === 'gr' || unit?.startsWith('grama') || unit === 'ml') grams = qty
      else if (unit === 'kg' || unit === 'l' || unit?.startsWith('litro')) grams = qty * 1000
      else {
        // sem unidade colada: verifica a palavra seguinte ("100 g", "2 fatias", "1 copo")
        const next = words[i + 1]
        if (next === 'g' || next === 'gr' || next === 'ml' || next?.startsWith('grama')) {
          grams = qty
          i++
        } else if (next === 'kg' || next === 'l' || next?.startsWith('litro')) {
          grams = qty * 1000
          i++
        } else if (next && MEDIDAS[next] !== undefined) {
          medida = MEDIDAS[next]
          i++
        }
      }
      continue
    }
    if (MEDIDAS[w] !== undefined && medida === undefined && grams === undefined) {
      medida = MEDIDAS[w]
      if (qty === undefined) qty = 1
      continue
    }
    if (!FILLER.has(w)) nameTokens.push(w)
  }

  const food = matchFood(nameTokens)
  if (!food) return { raw: trimmed, ok: false, kcal: 0, p: 0, c: 0, g: 0 }

  let finalGrams: number
  if (grams !== undefined) {
    finalGrams = grams
  } else {
    const q = qty ?? 1
    if (medida !== undefined && medida !== 'un') finalGrams = q * medida
    else finalGrams = q * (food.un ?? 100)
  }

  const f = finalGrams / 100
  return {
    raw: trimmed,
    ok: true,
    food: food.n,
    grams: Math.round(finalGrams),
    kcal: food.kcal * f,
    p: food.p * f,
    c: food.c * f,
    g: food.g * f,
  }
}

export function parseDay(text: string): DayMacros {
  const lines: ParsedLine[] = []
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const parsed = parseLine(raw)
    if (parsed) lines.push(parsed)
  }
  const sum = (k: 'kcal' | 'p' | 'c' | 'g') => lines.reduce((acc, l) => acc + l[k], 0)
  return { kcal: sum('kcal'), p: sum('p'), c: sum('c'), g: sum('g'), lines }
}
