import { useEffect, useState } from 'react';

function StudentModal({ isOpen, onClose, onSubmit, initialData = {} }) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setNumber(initialData.number ?? '');
      setName(initialData.name ?? '');
      setPhone(initialData.phone ?? '');
      setEmail(initialData.email ?? '');
      setPassword('');
      setPhoto(null);
      setPreview(initialData.photo ?? '');
      setErrors({});
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (photo) {
      const url = URL.createObjectURL(photo);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [photo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Informe o nome';
    if (!email.trim()) newErrors.email = 'Informe o e-mail';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'E-mail inválido';

    if (initialData && initialData._id) {
      if (password && password.length < 6)
        newErrors.password = 'Senha deve ter ao menos 6 caracteres';
    } else {
      if (!password.trim()) newErrors.password = 'Informe a senha';
      else if (password.length < 6)
        newErrors.password = 'Senha deve ter ao menos 6 caracteres';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    try {
      const payload = {
        name,
        email,
        ...(number ? { number: Number(number) } : {}),
        ...(phone ? { phone } : {}),
        ...(password ? { password } : {}),
        ...(photo ? { photo } : {}),
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      // erro tratado no onSubmit
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md p-md">
        <h2 className="text-xl text-orange">
          {initialData && initialData._id ? 'Editar Aluno' : 'Novo Aluno'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="flex flex-col items-center">
            {preview && (
              <img
                src={preview}
                alt="Pré-visualização"
                className="w-20 h-20 rounded-full object-cover mb-2"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
            />
          </div>
          <div>
            <label className="block mb-1">Número</label>
            <input
              type="number"
              className="w-full border p-sm rounded"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">Nome</label>
            <input
              type="text"
              className="w-full border p-sm rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block mb-1">Telefone</label>
            <input
              type="tel"
              className="w-full border p-sm rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">E-mail</label>
            <input
              type="email"
              className="w-full border p-sm rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block mb-1">Senha</label>
            <input
              type="password"
              className="w-full border p-sm rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
            )}
          </div>
          <div className="flex justify-end space-x-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentModal;
