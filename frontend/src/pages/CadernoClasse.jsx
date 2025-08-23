import { useEffect, useState } from 'react';
import { toArray } from '@/lib/http';
import { FiBook } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  createVisto,
  updateVisto,
  getVistos,
  getConfig,
  updateConfig,
} from '@/services/caderno';
import { listClasses } from '@/services/classes';
import { listStudents } from '@/services/students';

function CadernoClasse() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [checks, setChecks] = useState([]);
  const [bimester, setBimester] = useState('1');
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', term: '1', presentStudentIds: [] });
  const [configForm, setConfigForm] = useState({ 1: '', 2: '', 3: '', 4: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await listClasses();
        setClasses(arrify(res));
        setSuccess('Turmas carregadas');
        toast.success('Turmas carregadas');
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
        const message = err.response?.data?.message ?? 'Erro ao carregar turmas';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const fetchChecks = async (cls = selectedClass, bim = bimester) => {
    if (!cls) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [studRes, chkRes, cfgRes] = await Promise.all([
        listStudents(cls._id).catch(() => []),
        getVistos(cls._id, bim).catch(() => []),
        getConfig(cls._id).catch(() => ({ totals: {} }))
      ]);
      const filteredStudents = arrify(studRes).filter(
        (s) => s.class && (s.class._id || s.class) === cls._id
      );
      setStudents(filteredStudents);
      const checks = arrify(chkRes);
      setChecks(checks);
      const totals = cfgRes?.totals || {};
      setConfigForm({
        1: totals['1'] ?? '',
        2: totals['2'] ?? '',
        3: totals['3'] ?? '',
        4: totals['4'] ?? '',
      });
      setSuccess('Dados carregados');
      toast.success('Dados carregados');
    } catch (err) {
      console.error('Erro ao carregar vistos', err);
      const message = err.response?.data?.message ?? 'Erro ao carregar vistos';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = async (cls) => {
    setSelectedClass(cls);
    setBimester('1');
    await fetchChecks(cls, '1');
  };

  const toggleStudent = async (checkId, studentId) => {
    const current = arrify(checks).find((c) => c._id === checkId);
    if (!current) return;
    let present = arrify(current.presentStudentIds);
    if (present.includes(studentId)) {
      present = present.filter((id) => id !== studentId);
    } else {
      present.push(studentId);
    }
    try {
      await updateVisto(checkId, present);
      await fetchChecks(selectedClass, bimester);
    } catch (err) {
      console.error('Erro ao atualizar visto', err);
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar visto');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const term = form.term;
      await createVisto({
        class: selectedClass._id,
        title: form.title,
        date: form.date,
        term: Number(term),
        presentStudentIds: form.presentStudentIds,
      });
      setShowModal(false);
      setForm({ title: '', date: '', term: bimester, presentStudentIds: [] });
      await fetchChecks(selectedClass, term);
      const message = 'Visto criado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      console.error('Erro ao criar visto', err);
      const message = err.response?.data?.message ?? 'Erro ao criar visto';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFormStudent = (id) => {
    setForm((prev) => {
      const arr = arrify(prev.presentStudentIds);
      return arr.includes(id)
        ? { ...prev, presentStudentIds: arr.filter((s) => s !== id) }
        : { ...prev, presentStudentIds: [...arr, id] };
    });
  };

  const handleSaveConfig = async () => {
    try {
      await updateConfig(selectedClass._id, {
        1: Number(configForm[1] || 0),
        2: Number(configForm[2] || 0),
        3: Number(configForm[3] || 0),
        4: Number(configForm[4] || 0),
      });
      setShowConfigModal(false);
      await fetchChecks(selectedClass, bimester);
    } catch (err) {
      console.error('Erro ao salvar configuração', err);
      toast.error(err.response?.data?.message ?? 'Erro ao salvar configuração');
    }
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50">
        <div className="card w-full max-w-md p-md">
          <h2 className="text-xl">Novo Visto</h2>
          <div className="space-y-md">
            <div>
              <label className="block mb-1">Título</label>
              <input
                type="text"
                className="w-full border p-sm rounded"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block mb-1">Data</label>
              <input
                type="date"
                className="w-full border p-sm rounded"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block mb-1">Bimestre</label>
              <select
                className="w-full border p-sm rounded"
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
              >
                <option value="1">1º Bimestre</option>
                <option value="2">2º Bimestre</option>
                <option value="3">3º Bimestre</option>
                <option value="4">4º Bimestre</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Alunos presentes</label>
              <ul className="space-y-sm max-h-40 overflow-y-auto">
                {arrify(students).map((st) => (
                  <li key={st._id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={arrify(form.presentStudentIds).includes(st._id)}
                      onChange={() => toggleFormStudent(st._id)}
                    />
                    {st.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-sm">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleCreate}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfigModal = () => {
    if (!showConfigModal) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50">
        <div className="card w-full max-w-md p-md">
          <h2 className="text-xl">Configurar Totais</h2>
          <div className="space-y-md">
            {[1, 2, 3, 4].map((b) => (
              <div key={b}>
                <label className="block mb-1">{b}º Bimestre</label>
                <input
                  type="number"
                  className="w-full border p-sm rounded"
                  value={configForm[b]}
                  onChange={(e) => setConfigForm({ ...configForm, [b]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex justify-end space-x-sm">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => setShowConfigModal(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveConfig}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  if (loading) {
    return (
      <div className="pt-20 p-md">
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 p-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="pt-20 p-md">
        <h1 className="text-2xl text-orange">Caderno por Turma</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {arrify(classes).map((cls) => (
              <div
                key={cls._id}
                className="card flex items-center border border-orange-500 cursor-pointer"
                onClick={() => handleClassClick(cls)}
              >
                <FiBook className="w-6 h-6 text-orange mr-3" />
                <div>
                  <h3 className="text-orange text-lg font-semibold">
                    {cls.series}ª{cls.letter}
                  </h3>
                  <p className="text-black/70">Disciplina: {cls.discipline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h2 className="text-xl text-orange">
          {selectedClass.series}ª{selectedClass.letter} - {selectedClass.discipline}
        </h2>
        <button className="link-primary" onClick={() => setSelectedClass(null)}>
          Voltar
        </button>
      </div>
      <div className="flex justify-between items-center mb-md">
        <select
          className="border p-sm rounded"
          value={bimester}
          onChange={(e) => {
            setBimester(e.target.value);
            fetchChecks(selectedClass, e.target.value);
          }}
        >
          <option value="1">1º Bimestre</option>
          <option value="2">2º Bimestre</option>
          <option value="3">3º Bimestre</option>
          <option value="4">4º Bimestre</option>
        </select>
        <div className="space-x-sm">
          <button className="btn-primary" onClick={() => setShowConfigModal(true)}>
            Config Totais
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Novo Visto
          </button>
        </div>
      </div>

        {arrify(checks).map((chk) => (
          <div
            key={chk._id}
            className="mb-md p-md rounded-lg bg-white/30 backdrop-blur-md border border-orange-500 shadow-sm"
          >
            <div className="flex justify-between items-center mb-sm">
              <div>
                <h3 className="font-semibold">{chk.title}</h3>
                <p className="text-sm text-black/70">
                  {chk.date && !isNaN(new Date(chk.date))
                    ? new Date(chk.date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div className="w-40 bg-lightGray rounded-full h-2">
                <div
                  className="bg-orange h-2 rounded-full"
                  style={{ width: `${chk.percentual}%` }}
                ></div>
              </div>
            </div>
            <ul className="space-y-sm">
              {arrify(students).map((st) => {
                const checked = arrify(chk.presentStudentIds).includes(st._id);
                return (
                  <li
                    key={st._id}
                    className="flex items-center bg-white/30 border border-orange-500 rounded p-sm shadow-sm"
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => toggleStudent(chk._id, st._id)}
                    />
                    {st.name}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {renderModal()}
        {renderConfigModal()}
      </div>
    );
  }

export default CadernoClasse;



