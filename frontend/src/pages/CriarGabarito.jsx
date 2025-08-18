import { useEffect, useState, useCallback } from 'react';
import { getClasses } from '../services/classes';
import { createGabarito } from '../services/gabaritos';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function CriarGabarito() {
  const [step, setStep] = useState(1);
  const [classOptions, setClassOptions] = useState([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    leftLogo: null,
    rightLogo: null,
    schoolName: '',
    discipline: '',
    teacher: '',
    classes: [],
    numQuestions: '',
    totalValue: '',
    answerKey: ''
  });

  useEffect(() => {
    getClasses().then(setClassOptions).catch((err) => console.error(err));
  }, []);
  const generatePreview = useCallback(async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { leftLogo, rightLogo, schoolName, discipline, teacher, answerKey } = form;

    if (leftLogo) {
      const bytes = await fetch(leftLogo).then((res) => res.arrayBuffer());
      const img = await pdfDoc.embedPng(bytes);
      page.drawImage(img, { x: 50, y: 760, width: 50, height: 50 });
    }
    if (rightLogo) {
      const bytes = await fetch(rightLogo).then((res) => res.arrayBuffer());
      const img = await pdfDoc.embedPng(bytes);
      page.drawImage(img, { x: 495, y: 760, width: 50, height: 50 });
    }
    page.drawText(schoolName || '', { x: 110, y: 790, size: 14, font, color: rgb(0, 0, 0) });
    page.drawText(`${discipline || ''} - ${teacher || ''}`, { x: 110, y: 770, size: 12, font, color: rgb(0, 0, 0) });

    const answers = (answerKey || '').split(/\s*,\s*/);
    answers.forEach((ans, i) => {
      if (ans) {
        page.drawText(`${i + 1}. ${ans}`, { x: 50, y: 730 - i * 15, size: 12, font, color: rgb(0, 0, 0) });
      }
    });

    const pdfBytes = await pdfDoc.save();
    const blobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    setPreviewUrl(blobUrl);
  }, [form]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassToggle = (id) => {
    setForm((prev) => {
      const classes = prev.classes.includes(id)
        ? prev.classes.filter((c) => c !== id)
        : [...prev.classes, id];
      return { ...prev, classes };
    });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        answerKey: (form.answerKey || '').split(/\s*,\s*/)
      };
      await createGabarito(payload);
      setMessage({ type: 'success', text: 'Gabarito criado com sucesso!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao criar gabarito.' });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid gap-md">
            <div className="flex gap-md">
              <div className="flex-1">
                <label className="block mb-sm">Logo Esquerda</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'leftLogo')} />
              </div>
              <div className="flex-1">
                <label className="block mb-sm">Logo Direita</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'rightLogo')} />
              </div>
            </div>
            <input
              className="w-full border p-sm rounded"
              placeholder="Nome da Escola"
              name="schoolName"
              value={form.schoolName}
              onChange={handleInputChange}
            />
            <input
              className="w-full border p-sm rounded"
              placeholder="Disciplina"
              name="discipline"
              value={form.discipline}
              onChange={handleInputChange}
            />
            <input
              className="w-full border p-sm rounded"
              placeholder="Professor"
              name="teacher"
              value={form.teacher}
              onChange={handleInputChange}
            />
          </div>
        );
      case 2:
        return (
          <div className="grid gap-sm">
            {classOptions.map((cls) => (
              <label key={cls._id} className="flex items-center space-x-sm">
                <input
                  type="checkbox"
                  checked={form.classes.includes(cls._id)}
                  onChange={() => handleClassToggle(cls._id)}
                />
                <span>{cls.series}ª{cls.letter} - {cls.discipline}</span>
              </label>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="grid gap-md">
            <input
              className="w-full border p-sm rounded"
              placeholder="Número de questões"
              name="numQuestions"
              type="number"
              value={form.numQuestions}
              onChange={handleInputChange}
            />
            <input
              className="w-full border p-sm rounded"
              placeholder="Valor total da prova"
              name="totalValue"
              type="number"
              value={form.totalValue}
              onChange={handleInputChange}
            />
            <input
              className="w-full border p-sm rounded"
              placeholder="Gabarito (ex: A,B,C...)"
              name="answerKey"
              value={form.answerKey}
              onChange={handleInputChange}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-20 p-md">
      <h1 className="text-2xl text-orange mb-md">Criar Gabarito</h1>
      <div className="bg-gray-50/30 backdrop-blur-md border border-gray-300 rounded-lg p-md">
        {renderStep()}
        <div className="mt-md flex justify-between">
          {step > 1 && (
            <button className="px-4 py-2 border rounded" onClick={() => setStep(step - 1)}>
              Anterior
            </button>
          )}
          {step < 3 && (
            <button className="btn-primary ml-auto" onClick={() => setStep(step + 1)}>
              Próximo
            </button>
          )}
          {step === 3 && (
            <button className="btn-primary ml-auto" onClick={handleSubmit}>
              Enviar
            </button>
          )}
        </div>
        {message && (
          <p className={message.type === 'success' ? 'text-green-600 mt-sm' : 'text-red-600 mt-sm'}>
            {message.text}
          </p>
        )}
      </div>
      {previewUrl && (
        <div className="mt-md">
          <h2 className="text-lg text-orange mb-sm">Prévia</h2>
          <iframe src={previewUrl} className="w-full h-96 border" title="preview" />
        </div>
      )}
    </div>
  );
}

export default CriarGabarito;
