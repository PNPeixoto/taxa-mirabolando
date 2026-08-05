import type { Bairro, ItemConta, MatchType } from '../types'
import { BAIRROS } from '../data/bairros'

// Máxima distância normalizada aceita como match válido (0–1).
// Acima disso → "não encontrado" em vez de chutar.
const FUZZY_THRESHOLD = 0.45

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9 ]/g, ' ')      // remove especiais
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) m[0][j] = j
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] =
        b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1)
  return m[b.length][a.length]
}

interface ScoreResult {
  score: number
  tipo: Exclude<MatchType, 'nao_encontrado'>
  distNorm: number
}

function calcularScore(termoN: string, bairro: Bairro): ScoreResult {
  const bairroN = normalizar(bairro.nome)

  // 1. Correspondência exata
  if (termoN === bairroN) return { score: 0, tipo: 'exato', distNorm: 0 }

  // 2. O termo é prefixo exato do bairro (ex: "bela vista" → "bela vista industrial")
  //    Prefere o nome mais curto para desempate
  if (bairroN.startsWith(termoN + ' ') || bairroN === termoN) {
    return { score: 100 + bairro.nome.length, tipo: 'exato', distNorm: 0.05 }
  }

  // 3. O termo está contido no nome
  if (bairroN.includes(termoN)) {
    return { score: 300 + bairro.nome.length, tipo: 'parcial', distNorm: 0.15 }
  }

  // 4. Levenshtein normalizado como fallback
  const maxLen = Math.max(termoN.length, bairroN.length)
  const dist = levenshtein(termoN, bairroN)
  const distNorm = dist / maxLen
  const tipo: Exclude<MatchType, 'nao_encontrado'> = distNorm < 0.35 ? 'parcial' : 'fuzzy'

  return { score: 500 + distNorm * 1000, tipo, distNorm }
}

export function encontrarBairro(termo: string): ItemConta {
  const termoN = normalizar(termo)
  const id = crypto.randomUUID()

  let melhorBairro: Bairro | null = null
  let melhorScore = Infinity
  let melhorTipo: Exclude<MatchType, 'nao_encontrado'> = 'fuzzy'
  let melhorDistNorm = 1

  for (const bairro of BAIRROS) {
    const { score, tipo, distNorm } = calcularScore(termoN, bairro)
    if (score < melhorScore) {
      melhorScore = score
      melhorBairro = bairro
      melhorTipo = tipo
      melhorDistNorm = distNorm
    }
  }

  // Rejeita o match se a distância normalizada exceder o limiar
  if (!melhorBairro || melhorDistNorm > FUZZY_THRESHOLD) {
    return { id, lido: termo, nome: '—', taxa: 0, tipo: 'nao_encontrado' }
  }

  return {
    id,
    lido: termo,
    nome: melhorBairro.nome,
    taxa: melhorBairro.taxa,
    tipo: melhorTipo,
  }
}

export { BAIRROS }
