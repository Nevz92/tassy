export interface Profile {
  nome: string
  nascimento?: string // YYYY-MM-DD
  alturaCm?: number
  pesoInicial?: number
  metaKcal: number
}

export interface Agua {
  b500: boolean
  b700: boolean
  b900: boolean
}

export interface Cardio {
  bike: number
  escada: number
  corrida: number
  transport: number
  outros: number
}

export interface Musculacao {
  inferior: boolean
  superior: boolean
  abdominal: boolean
}

export interface DayEntry {
  date: string // YYYY-MM-DD
  agua: Agua
  cardio: Cardio
  musculacao: Musculacao
  intestino: boolean
  menstruacao: boolean
  alimentosTexto: string
}

export interface PhotoRec {
  id: string
  date: string // YYYY-MM-DD
  blob: Blob
}

export const CARDIO_LABELS: { key: keyof Cardio; label: string }[] = [
  { key: 'bike', label: '🚴 Bike' },
  { key: 'escada', label: '🪜 Escada' },
  { key: 'corrida', label: '🏃‍♀️ Corrida' },
  { key: 'transport', label: '🚶‍♀️ Transport' },
  { key: 'outros', label: '✨ Outros' },
]

export const MUSC_LABELS: { key: keyof Musculacao; label: string }[] = [
  { key: 'inferior', label: '🦵 Inferior' },
  { key: 'superior', label: '💪 Superior' },
  { key: 'abdominal', label: '🔥 Abdominal' },
]

export function emptyDay(date: string): DayEntry {
  return {
    date,
    agua: { b500: false, b700: false, b900: false },
    cardio: { bike: 0, escada: 0, corrida: 0, transport: 0, outros: 0 },
    musculacao: { inferior: false, superior: false, abdominal: false },
    intestino: false,
    menstruacao: false,
    alimentosTexto: '',
  }
}
