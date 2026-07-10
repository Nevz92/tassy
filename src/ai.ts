import Anthropic from '@anthropic-ai/sdk'
import type { Food } from './parser'

const KEY_STORAGE = 'tassy-api-key'

export function getApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? ''
}

export function setApiKey(k: string) {
  if (k.trim()) localStorage.setItem(KEY_STORAGE, k.trim())
  else localStorage.removeItem(KEY_STORAGE)
}

export class SemChaveError extends Error {
  constructor() {
    super('Chave da API não configurada')
  }
}

const SCHEMA = {
  type: 'object',
  properties: {
    reconhecido: {
      type: 'boolean',
      description: 'false se o texto não descrever um alimento ou bebida reais',
    },
    nome: {
      type: 'string',
      description:
        'nome do alimento em minúsculas, sem quantidades nem números, próximo de como o usuário escreveu',
    },
    kcal: { type: 'number', description: 'calorias por 100g' },
    p: { type: 'number', description: 'proteínas em gramas por 100g' },
    c: { type: 'number', description: 'carboidratos em gramas por 100g' },
    g: { type: 'number', description: 'gorduras em gramas por 100g' },
    un: { type: 'number', description: 'peso em gramas de 1 unidade ou porção típica' },
  },
  required: ['reconhecido', 'nome', 'kcal', 'p', 'c', 'g', 'un'],
  additionalProperties: false,
} as const

const SYSTEM = `Você é uma nutricionista brasileira. O usuário informa o nome de um alimento, prato ou bebida (às vezes com marca ou quantidade — ignore quantidades). Estime a composição nutricional POR 100g (ou 100ml para líquidos), usando como referência as tabelas TACO/TBCA e rótulos brasileiros. Para pratos compostos, estime a receita típica brasileira. Estimativas realistas e conservadoras.`

/** Estima macros de um alimento desconhecido via Claude. Retorna null se não for um alimento. */
export async function estimarAlimento(texto: string): Promise<Food | null> {
  const apiKey = getApiKey()
  if (!apiKey) throw new SemChaveError()

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Alimento: "${texto}"` }],
  })

  if (res.stop_reason === 'refusal') return null
  const block = res.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') return null

  const data = JSON.parse(block.text) as {
    reconhecido: boolean
    nome: string
    kcal: number
    p: number
    c: number
    g: number
    un: number
  }
  if (!data.reconhecido) return null

  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    n: data.nome.trim().toLowerCase(),
    kcal: r1(data.kcal),
    p: r1(data.p),
    c: r1(data.c),
    g: r1(data.g),
    un: Math.round(data.un) || undefined,
  }
}
