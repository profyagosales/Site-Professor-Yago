import { useEffect, useState } from 'react';
import axios from 'axios';
import { createVisto, updateVisto, getVistos } from '../services/caderno';

function CadernoClasse() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [checks, setChecks] = useState([]);
  const [bimester, setBimester] = useState('1');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', bimester: '1', totalValue: '' });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get('http://localhost:5000/classes');
        setClasses(res.data);
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
      }
    };
    fetchClasses();
  }, []);

  const fetchChecks = async (cls = selectedClass, bim = bimester) => {
    if (!cls) return;
    try {
      const [studRes, chkRes] = await Promise.all([
        axios
          .get(`http://localhost:5000/students?class=${cls._id}`)
          .catch(() => ({ data: [] })),
        getVistos(cls._id, bim).catch(() => [])
      ]);
      const filteredStudents = (studRes.data || []).filter(
        (s) => (s.class && (s.class._id || s.class) === cls._id)
      );
      setStudents(filteredStudents);
      setChecks(chkRes || []);
    } catch (err) {
      console.error('Erro ao carregar vistos', err);
    }
  };

  const handleClassClick = async (cls) => {
    setSelectedClass(cls);
    setBimester('1');
    await fetchChecks(cls, '1');
  };

  const toggleStudent = async (checkId, studentId) => {
    const updatedChecks = checks.map((chk) => {
      if (chk._id !== checkId) return chk;
      const studentsUpdated = chk.students.map((s) =>
        s.student === studentId ? { ...s, done: !s.done } : s
      );
      const percentual = studentsUpdated.filter((s) => s.done).length / studentsUpdated.length * 100;
      return { ...chk, students: studentsUpdated, percentual };
    });
    setChecks(updatedChecks);
    const current = updatedChecks.find((c) => c._id === checkId);
    try {
      await updateVisto(checkId, current.students);
    } catch (err) {
      console.error('Erro ao atualizar visto', err);
    }
  };

  const handleCreate = async () => {
    try {
      await createVisto({
        class: selectedClass._id,
        description: form.title,
        date: form.date,
        bimester: Number(form.bimester),
        totalValue: Number(form.totalValue)
      });
      setShowModal(false);
      setForm({ title: '', date: '', bimester: '1', totalValue: '' });
      await fetchChecks(selectedClass, form.bimester);
    } catch (err) {
      console.error('Erro ao criar visto', err);
    }
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50">
        <div className="card w-full max-w-md p-md">
          <h2 className="text-xl mb-md">Novo Visto</h2>
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
                value={form.bimester}
                onChange={(e) => setForm({ ...form, bimester: e.target.value })}
              >
                <option value="1">1º Bimestre</option>
                <option value="2">2º Bimestre</option>
                <option value="3">3º Bimestre</option>
                <option value="4">4º Bimestre</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Valor total do caderno no bimestre</label>
              <input
                type="number"
                className="w-full border p-sm rounded"
                value={form.totalValue}
                onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
              />
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

  if (!selectedClass) {
    return (
      <div className="pt-20 p-md">
        <h1 className="text-2xl text-orange mb-md">Caderno por Turma</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {classes.map((cls) => (
            <div
              key={cls._id}
              className="flex items-center bg-gray-50/30 backdrop-blur-md border border-orange-400 rounded-lg p-md shadow-subtle cursor-pointer"
              onClick={() => handleClassClick(cls)}
            >
              <svg
                className="w-6 h-6 text-orange mr-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20l9-5-9-5-9 5 9 5zm0-10l9-5-9-5-9 5 9 5z"
                ></path>
              </svg>
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
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Novo Visto
        </button>
      </div>

      {checks.map((chk) => (
        <div
          key={chk._id}
          className="mb-md p-md rounded-lg bg-gray-50/30 backdrop-blur-md border border-gray-200 shadow-subtle"
        >
          <div className="flex justify-between items-center mb-sm">
            <div>
              <h3 className="font-semibold">{chk.description}</h3>
              <p className="text-sm text-black/70">
                {new Date(chk.date).toLocaleDateString()}
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
            {students.map((st) => {
              const entry = chk.students.find((s) => s.student === st._id);
              return (
                <li key={st._id} className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={entry ? entry.done : false}
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
    </div>
  );
}

export default CadernoClasse;

