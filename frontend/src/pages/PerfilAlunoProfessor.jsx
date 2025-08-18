function PerfilAlunoProfessor() {
  const student = {
    photo: 'https://via.placeholder.com/150',
    name: 'Maria Silva',
    email: 'maria.silva@example.com',
    phone: '(11) 98765-4321',
    callNumber: 23,
    grades: [
      { term: '1º Bimestre', average: 8.5 },
      { term: '2º Bimestre', average: 7.0 },
      { term: '3º Bimestre', average: 9.0 },
      { term: '4º Bimestre', average: 8.0 },
    ],
  };

  const exportPDF = () => {
    window.print();
  };

  const sendEmail = () => {
    window.location.href = `mailto:${student.email}?subject=Boletim`;
  };

  return (
    <div className="pt-20 p-md">
      <div className="max-w-3xl mx-auto space-y-md">
        <div className="flex flex-col items-center p-md bg-gray-50/30 backdrop-blur-md border border-gray-200 rounded-lg shadow-subtle">
          <img
            src={student.photo}
            alt={student.name}
            className="w-32 h-32 rounded-full object-cover mb-md"
          />
          <h1 className="text-xl font-semibold">{student.name}</h1>
          <p>{student.email}</p>
          <p>{student.phone}</p>
          <p>Nº chamada: {student.callNumber}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {student.grades.map((g) => (
            <div
              key={g.term}
              className="p-md bg-gray-50/30 backdrop-blur-md border border-gray-200 rounded-lg shadow-subtle"
            >
              <h2 className="font-semibold mb-2">{g.term}</h2>
              <div className="w-full bg-lightGray h-2 rounded-full mb-2">
                <div
                  className="bg-orange h-2 rounded-full"
                  style={{ width: `${(g.average / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-black/70">Média: {g.average}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-md justify-center">
          <button onClick={exportPDF} className="btn-primary">
            Exportar PDF
          </button>
          <button onClick={sendEmail} className="btn-primary">
            Enviar por E-mail
          </button>
        </div>
      </div>
    </div>
  );
}

export default PerfilAlunoProfessor;
