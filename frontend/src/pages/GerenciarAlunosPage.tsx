import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent, Student } from '../services/studentService'; // Assumindo que studentService existe
import { getClasses, Class } from '../services/classService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface StudentFormData {
  name: string;
  email: string;
  password?: string;
  active: boolean;
  classId: string;
}

export function GerenciarAlunosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<StudentFormData>();

  const fetchStudentsAndClasses = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        getStudents({ page, limit: 10, query: searchQuery, classId: filterClassId }),
        getClasses({ limit: 500 }) // Fetch all classes for dropdowns
      ]);
      setStudents(studentsData.users);
      setTotalPages(studentsData.pagination.pages);
      setClasses(classesData.classes);
    } catch (error) {
      toast.error('Erro ao carregar dados.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterClassId]);

  useEffect(() => {
    fetchStudentsAndClasses();
  }, [fetchStudentsAndClasses]);

  const handleOpenModal = (student: Student | null = null) => {
    setEditingStudent(student);
    if (student) {
      setValue('name', student.name);
      setValue('email', student.email);
      setValue('active', student.active);
      setValue('classId', student.classId?._id || '');
      setValue('password', ''); // Senha em branco por padrão na edição
    } else {
      reset({ name: '', email: '', password: '', active: true, classId: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    reset();
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      const payload: any = { ...data };
      // Não enviar senha se estiver vazia durante a edição
      if (editingStudent && !payload.password) {
        delete payload.password;
      }

      if (editingStudent) {
        await updateStudent(editingStudent._id, payload);
        toast.success('Aluno atualizado com sucesso!');
      } else {
        await createStudent(payload);
        toast.success('Aluno criado com sucesso!');
      }
      fetchStudentsAndClasses();
      handleCloseModal();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar aluno.';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
      try {
        await deleteStudent(id);
        toast.success('Aluno excluído com sucesso!');
        fetchStudentsAndClasses();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Erro ao excluir aluno.';
        toast.error(errorMessage);
        console.error(error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Alunos</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" /> Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="name">Nome Completo</label>
                <Input id="name" {...register('name', { required: 'Nome é obrigatório' })} />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <Input id="email" type="email" {...register('email', { required: 'Email é obrigatório' })} />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="password">Senha</label>
                <Input id="password" type="password" {...register('password', { required: !editingStudent })} placeholder={editingStudent ? 'Deixe em branco para não alterar' : ''} />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="classId">Turma</label>
                <Select onValueChange={(value) => setValue('classId', value)} value={watch('classId')}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map((cls) => (
                            <SelectItem key={cls._id} value={cls._id}>{cls.name} - {cls.year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.classId && <p className="text-red-500 text-sm mt-1">{errors.classId.message}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="active" {...register('active')} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                <label htmlFor="active">Ativo</label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex space-x-4 mb-4">
        <Input 
          placeholder="Buscar por nome..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={setFilterClassId} value={filterClassId}>
            <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Filtrar por turma..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="">Todas as turmas</SelectItem>
                {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>{cls.name} - {cls.year}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
            ) : students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.classId ? `${student.classId.name} - ${student.classId.year}` : 'Sem turma'}</TableCell>
                  <TableCell>
                    <Badge variant={student.active ? 'default' : 'destructive'}>
                      {student.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(student)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(student._id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Nenhum aluno encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Paginação (se necessário) */}
    </div>
  );
}