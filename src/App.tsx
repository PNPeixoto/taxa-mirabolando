import { useRef, useState } from 'react'
import type { ItemConta, MatchType } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { encontrarBairro } from './utils/matcher'

// ─── Badge de confiança ────────────────────────────────────────────────────
const BADGE: Record<MatchType, { label: string; className: string }> = {
  exato:         { label: 'exato',         className: 'bg-green-100 text-green-800' },
  parcial:       { label: 'parcial',        className: 'bg-amber-100 text-amber-800' },
  fuzzy:         { label: 'fuzzy?',         className: 'bg-orange-100 text-orange-800' },
  nao_encontrado:{ label: 'não encontrado', className: 'bg-red-100 text-red-700' },
}

function Badge({ tipo }: { tipo: MatchType }) {
  const { label, className } = BADGE[tipo]
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-2 ${className}`}>
      {label}
    </span>
  )
}

// ─── Linha da tabela ────────────────────────────────────────────────────────
function ItemRow({ item, onRemove }: { item: ItemConta; onRemove: (id: string) => void }) {
  const naoEncontrado = item.tipo === 'nao_encontrado'
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-2.5 px-4 text-sm text-gray-500">{item.lido}</td>
      <td className="py-2.5 px-4 text-sm">
        <span className={naoEncontrado ? 'text-red-500 italic' : 'font-medium text-gray-800'}>
          {item.nome}
        </span>
        <Badge tipo={item.tipo} />
      </td>
      <td className="py-2.5 px-4 text-sm font-mono text-gray-700">
        {naoEncontrado ? '—' : `R$ ${item.taxa.toFixed(2)}`}
      </td>
      <td className="py-2.5 px-4 text-right">
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none px-1"
          aria-label="Remover"
        >
          ×
        </button>
      </td>
    </tr>
  )
}

// ─── App principal ──────────────────────────────────────────────────────────
export default function App() {
  const [itens, setItens] = useLocalStorage<ItemConta[]>('taxas-macae-itens', [])
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const itensFiltrados = itens.filter(i => i.tipo !== 'nao_encontrado')
  const total = itensFiltrados.reduce((acc, i) => acc + i.taxa, 0)
  const naoEncontrados = itens.filter(i => i.tipo === 'nao_encontrado')

  const resumo = itensFiltrados.length > 0
    ? `${itensFiltrados.map(i => i.taxa.toFixed(0)).join(' + ')} = ${total.toFixed(2)}`
    : ''

  function processar() {
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)
    if (!linhas.length) return
    const novos = linhas.map(encontrarBairro)
    setItens(prev => [...prev, ...novos])
    setTexto('')
  }

  function remover(id: string) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function limpar() {
    if (confirm('Zerar a conta? Isso vai apagar o histórico salvo.')) {
      setItens([])
    }
  }

  async function copiar() {
    if (!resumo) return
    try {
      await navigator.clipboard.writeText(resumo)
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select()
        document.execCommand('copy')
      }
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') processar()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-800 text-center">
            Calculadora de Taxas
          </h1>
          <p className="text-xs text-center text-gray-400 mt-0.5">Macaé · salvo automaticamente</p>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Bairros (um por linha)
          </label>
          <textarea
            className="w-full h-28 text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono placeholder:text-gray-300"
            placeholder={'Centro\nRiviera\nCavaleiros'}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={processar}
            disabled={!texto.trim()}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Processar lista
            <span className="ml-2 text-blue-200 text-xs font-normal">Ctrl+Enter</span>
          </button>
        </div>

        {/* Tabela */}
        {itens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="py-2 px-4 text-xs font-medium text-gray-400 w-1/4">Digitado</th>
                  <th className="py-2 px-4 text-xs font-medium text-gray-400">Bairro</th>
                  <th className="py-2 px-4 text-xs font-medium text-gray-400 w-24">Taxa</th>
                  <th className="py-2 px-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {itens.map(item => (
                  <ItemRow key={item.id} item={item} onRemove={remover} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-300">
            Nenhum bairro adicionado ainda
          </div>
        )}

        {/* Aviso de não encontrados */}
        {naoEncontrados.length > 0 && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
            <span className="font-medium">{naoEncontrados.length} bairro(s) não reconhecido(s): </span>
            {naoEncontrados.map(i => i.lido).join(', ')} — verifique a grafia ou adicione ao cadastro.
          </div>
        )}

        {/* Registro / resumo */}
        {resumo && (
          <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1.5">Registro para bloco de notas</p>
            <textarea
              ref={textareaRef}
              readOnly
              value={resumo}
              rows={2}
              className="w-full text-xs font-mono bg-white border border-yellow-200 rounded px-2 py-1.5 resize-none text-gray-700"
            />
            <button
              onClick={copiar}
              className={`mt-1.5 text-xs px-3 py-1 rounded border transition-colors ${
                copiado
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {copiado ? '✓ Copiado!' : 'Copiar registro'}
            </button>
          </div>
        )}

        {/* Rodapé / total */}
        <div className="px-6 py-5 mt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {itensFiltrados.length} entrega{itensFiltrados.length !== 1 ? 's' : ''}
              {naoEncontrados.length > 0 && (
                <span className="ml-1 text-red-400">
                  · {naoEncontrados.length} inválido{naoEncontrados.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <p className="text-3xl font-semibold text-blue-600 mt-0.5">
              R$ {total.toFixed(2)}
            </p>
          </div>
          {itens.length > 0 && (
            <button
              onClick={limpar}
              className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
            >
              Zerar tudo
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
