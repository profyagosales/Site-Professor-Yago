import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { paths } from '../routes/paths'
import { essayService, Essay } from '../services/essayService'
import { getClasses } from '@/services/classService'
import { getThemes } from '@/services/themeService'
import toast, { Toaster } from 'react-hot-toast'

export function RevisarRedacoesPage() {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'corrigidas'>('pendentes')
  const [pending, setPending] = useState<Essay[]>([])
  const [graded, setGraded] = useState<Essay[]>([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [loadingGraded, setLoadingGraded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Filtros
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedBimester, setSelectedBimester] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedThemeId, setSelectedThemeId] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [refreshToken, setRefreshToken] = useState<number>(0)

  // Turmas dinâmicas
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([{ id: '', name: 'Todas as turmas' }])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [classesError, setClassesError] = useState<string | null>(null)

  // Cache simples em módulo (escopo de execução)
  const classesCacheRef = (window as any).__classesCacheRef || ((window as any).__classesCacheRef = { data: null as any, ts: 0 })
  const CLASSES_CACHE_TTL = 60 * 1000 // 1 minuto

  // Temas dinâmicos
  const [themeOptions, setThemeOptions] = useState<{ id: string; title: string }[]>([{ id: '', title: 'Todos os temas' }])
  const [loadingThemes, setLoadingThemes] = useState(false)
  const [themesError, setThemesError] = useState<string | null>(null)
  const themesCacheRef = (window as any).__themesCacheRef || ((window as any).__themesCacheRef = { data: null as any, ts: 0 })
  const THEMES_CACHE_TTL = 60 * 1000

  const loadClasses = useCallback(async () => {
    try {
      setLoadingClasses(true)
      setClassesError(null)
      const now = Date.now()
      if (classesCacheRef.data && (now - classesCacheRef.ts) < CLASSES_CACHE_TTL) {
        setClassOptions([{ id: '', name: 'Todas as turmas' }, ...classesCacheRef.data.map((c: any)=>({ id: c._id, name: c.name }))])
        return
      }
      const res = await getClasses({ limit: 100 })
      const mapped = res.classes.map(c => ({ id: c._id, name: c.name }))
      classesCacheRef.data = res.classes
      classesCacheRef.ts = now
      setClassOptions([{ id: '', name: 'Todas as turmas' }, ...mapped])
    } catch (e: any) {
      console.error('Erro ao carregar turmas', e)
      setClassesError(e.message || 'Erro ao carregar turmas')
      toast.error('Erro ao carregar turmas')
    } finally { setLoadingClasses(false) }
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  const buildCommonParams = () => {
    const params: any = { page: 1, limit: 50 };
    if (selectedType) params.type = selectedType;
    if (selectedBimester) params.bimester = Number(selectedBimester);
    if (selectedClassId) params.classId = selectedClassId;
    if (search.trim()) params.q = search.trim();
    if (selectedThemeId) params.themeId = selectedThemeId;
    return params;
  }

  const loadPending = useCallback(async () => {
    setLoadingPending(true)
    try {
      // Carregar PENDING
      const baseParams = buildCommonParams();
      const resPending = await essayService.getEssays({ ...baseParams, status: 'PENDING' });
      const listPending = (resPending as any).essays || (resPending as any).data || [];
      // Carregar GRADING (em andamento) para permitir retomada
      const resGrading = await essayService.getEssays({ ...baseParams, status: 'GRADING' });
      const listGrading = (resGrading as any).essays || (resGrading as any).data || [];
      const merged = [...listPending, ...listGrading]
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPending(merged)
    } catch (e: any) {
      setError(e.message)
      toast.error('Erro ao carregar pendentes')
    } finally { setLoadingPending(false) }
  }, [selectedClassId, selectedBimester, selectedType, selectedThemeId, search, refreshToken])

  const loadThemes = useCallback(async () => {
    try {
      setLoadingThemes(true)
      setThemesError(null)
      const now = Date.now()
      if (themesCacheRef.data && (now - themesCacheRef.ts) < THEMES_CACHE_TTL) {
        setThemeOptions([{ id: '', title: 'Todos os temas' }, ...themesCacheRef.data.map((t: any)=>({ id: t._id, title: t.title }))])
        return
      }
      const res = await getThemes({ limit: 100, active: true })
      themesCacheRef.data = res.themes
      themesCacheRef.ts = now
      setThemeOptions([{ id: '', title: 'Todos os temas' }, ...res.themes.map(t => ({ id: t._id, title: t.title }))])
    } catch (e: any) {
      console.error('Erro ao carregar temas', e)
      setThemesError(e.message || 'Erro ao carregar temas')
      toast.error('Erro ao carregar temas')
    } finally { setLoadingThemes(false) }
  }, [])

  useEffect(() => { loadThemes() }, [loadThemes])
  const loadGraded = useCallback( async () => {
    setLoadingGraded(true)
    try {
      const baseParams = buildCommonParams();
      const resGraded = await essayService.getEssays({ ...baseParams, status: 'GRADED' });
      const data = (resGraded as any).essays || (resGraded as any).data || [];
      setGraded(data)
    } catch (e: any) {
      setError(e.message)
      toast.error('Erro ao carregar corrigidas')
    } finally { setLoadingGraded(false) }
  }, [selectedClassId, selectedBimester, selectedType, search, refreshToken])

  useEffect(() => { loadPending(); loadGraded(); }, [loadPending, loadGraded])

  // Função para criar nova redação em nome do aluno
  const criarNovaRedacao = () => {
    console.log('Criar nova redação para aluno')
    // Implementar modal para seleção do aluno e upload de redação
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Revisar Redações</h1>
          <div className="flex gap-2">
            <button
              onClick={criarNovaRedacao}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              Cadastrar Redação
            </button>
            <Link
              to={paths.dashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex">
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'pendentes'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('pendentes')}
            >
              Pendentes ({loadingPending ? '...' : pending.length})
            </button>
            <button
              className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'corrigidas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('corrigidas')}
            >
              Corrigidas ({loadingGraded ? '...' : graded.length})
            </button>
          </nav>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {loadingClasses && <div className="text-xs text-gray-500 mt-1">Carregando turmas...</div>}
              {classesError && <div className="text-xs text-red-600 mt-1">{classesError}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
              <select value={selectedThemeId} onChange={e=>setSelectedThemeId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                {themeOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              {loadingThemes && <div className="text-xs text-gray-500 mt-1">Carregando temas...</div>}
              {themesError && <div className="text-xs text-red-600 mt-1">{themesError}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bimestre</label>
              <select value={selectedBimester} onChange={e=>setSelectedBimester(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="1">1º Bimestre</option>
                <option value="2">2º Bimestre</option>
                <option value="3">3º Bimestre</option>
                <option value="4">4º Bimestre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={selectedType} onChange={e=>setSelectedType(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="ENEM">ENEM</option>
                <option value="PAS">PAS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar (tema)</label>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Digite parte do tema..." className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={()=>{ setSelectedClassId(''); setSelectedBimester(''); setSelectedType(''); setSearch(''); }} className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Limpar</button>
              <button onClick={()=>{ setSelectedClassId(''); setSelectedBimester(''); setSelectedType(''); setSelectedThemeId(''); setSearch(''); }} className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">Limpar</button>
              <button onClick={()=>setRefreshToken(t=>t+1)} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Atualizar</button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-4">
            <span>Pendentes inclui status PENDING + GRADING</span>
            {loadingPending && <span>Carregando pendentes...</span>}
            {loadingGraded && <span>Carregando corrigidas...</span>}
          </div>
        </div>

        {/* Lista de redações */}
        {activeTab === 'pendentes' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border text-left">Aluno</th>
                  <th className="px-4 py-2 border text-left">Tema</th>
                  <th className="px-4 py-2 border text-center">Tipo</th>
                  <th className="px-4 py-2 border text-center">Bimestre</th>
                  <th className="px-4 py-2 border text-center">Data</th>
                  <th className="px-4 py-2 border text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((redacao: any) => (
                  <tr key={redacao._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {(redacao as any).studentId?.photoUrl ? (
                            <img src={(redacao as any).studentId.photoUrl} alt={(redacao as any).studentId.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">{(redacao as any).studentId?.name?.split(' ').map((n:string)=>n[0]).join('')}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{(redacao as any).studentId?.name}</div>
                          <div className="text-sm text-gray-500">{(redacao as any).studentId?.class || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{(redacao as any).themeId?.title || redacao.themeText || 'Tema não informado'}</td>
                    <td className="px-4 py-2 border text-center">
                      {redacao.type}
                      {redacao.status === 'GRADING' && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Em andamento</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border text-center">{redacao.bimester || redacao.bimestre || '—'}</td>
                    <td className="px-4 py-2 border text-center">{new Date(redacao.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 border text-center">
                      <Link to={`${paths.corrigirRedacao}/${redacao._id}`} className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition inline-block">Corrigir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'corrigidas' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border text-left">Aluno</th>
                  <th className="px-4 py-2 border text-left">Tema</th>
                  <th className="px-4 py-2 border text-center">Tipo</th>
                  <th className="px-4 py-2 border text-center">Nota</th>
                  <th className="px-4 py-2 border text-center">Enviado</th>
                  <th className="px-4 py-2 border text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {graded.map((redacao: any) => (
                  <tr key={redacao._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                          {(redacao as any).studentId?.photoUrl ? (
                            <img src={(redacao as any).studentId.photoUrl} alt={(redacao as any).studentId.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">{(redacao as any).studentId?.name?.split(' ').map((n:string)=>n[0]).join('')}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{(redacao as any).studentId?.name}</div>
                          <div className="text-sm text-gray-500">{(redacao as any).studentId?.class || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{(redacao as any).themeId?.title || redacao.themeText || 'Tema não informado'}</td>
                    <td className="px-4 py-2 border text-center">{redacao.type}</td>
                    <td className="px-4 py-2 border text-center font-medium">{redacao.enem?.rawScore || redacao.pas?.rawScore || redacao.finalGrade || '—'}</td>
                    <td className="px-4 py-2 border text-center">{redacao.status === 'SENT' ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-2 border text-center">
                      <div className="flex justify-center space-x-2">
                        <Link to={`${paths.corrigirRedacao}/${redacao._id}`} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition">Revisar</Link>
                        {redacao.status === 'SENT' ? (
                          <span className="text-xs text-green-600 font-medium">Enviado</span>
                        ) : (
                          <button className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition">Enviar PDF</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensagem quando não há redações */}
        {activeTab === 'pendentes' && pending.length === 0 && !loadingPending && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações pendentes de correção.</p>
          </div>
        )}
        
        {activeTab === 'corrigidas' && graded.length === 0 && !loadingGraded && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">Não há redações corrigidas.</p>
          </div>
        )}
        <Toaster position="top-center" />
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}