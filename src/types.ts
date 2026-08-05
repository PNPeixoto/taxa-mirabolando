export type MatchType = 'exato' | 'parcial' | 'fuzzy' | 'nao_encontrado'

export interface Bairro {
  nome: string
  taxa: number
}

export interface ItemConta {
  id: string
  lido: string
  nome: string
  taxa: number
  tipo: MatchType
}
