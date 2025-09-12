import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getClasses, createClass, updateClass, deleteClass, Class } from '../services/classService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ClassFormData {
  name: string;
  year: number;
}

const GerenciarTurmasPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClassFormData>();

  const fetchClasses = useCallback(async () => {
    try {
      const data = await getClasses({ limit: 100 }); // Fetch all classes
      setClasses(data.classes);
    } catch (error) {
      toast.error('Erro ao buscar turmas.');
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenModal = (cls: Class | null = null) => {
    setEditingClass(cls);
    if (cls) {
      setValue('name', cls.name);
      setValue('year', cls.year);
    } else {
      reset({ name: '', year: new Date().getFullYear() });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
    reset();
  };

  const onSubmit = async (data: ClassFormData) => {
    try {
      const payload = { ...data, year: Number(data.year) };
      if (editingClass) {
        await updateClass(editingClass._id, payload);
        toast.success('Turma atualizada com sucesso!');
      } else {
        await createClass(payload);
        toast.success('Turma criada com sucesso!');
      }
      fetchClasses();
      handleCloseModal();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar turma.';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.')) {
      try {
        await deleteClass(id);
        toast.success('Turma excluída com sucesso!');
        fetchClasses();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Erro ao excluir turma. Verifique se não há alunos vinculados a ela.';
        toast.error(errorMessage);
        console.error(error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Turmas</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome da Turma</label>
                <Input
                  id="name"
                  {...register('name', { required: 'Nome é obrigatório' })}
                  className="mt-1"
                  placeholder="Ex: Terceirão A"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Ano</label>
                <Input
                  id="year"
                  type="number"
                  {...register('year', { 
                    required: 'Ano é obrigatório',
                    valueAsNumber: true,
                    min: { value: 2020, message: 'O ano deve ser 2020 ou posterior' }
                  })}
                  className="mt-1"
                  placeholder="Ex: 2024"
                />
                {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Turma</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length > 0 ? (
              classes.map((cls) => (
                <TableRow key={cls._id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.year}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cls)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cls._id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Nenhuma turma encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GerenciarTurmasPage;
