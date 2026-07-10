export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const DIAS_SEMANA_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const pad = (n: number) => String(n).padStart(2, '0')

/** month é 0-based */
export function dateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay()
}

/** Segunda-feira da semana que contém a data */
export function weekStartOf(date: Date): string {
  const d = new Date(date)
  const off = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - off)
  return toDateStr(d)
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** "ter, 08/07" */
export function shortLabel(date: string): string {
  const d = parseDate(date)
  return `${DIAS_SEMANA_CURTO[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}
