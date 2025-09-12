import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/AuthStateProvider';
import { getThemes, Theme } from '../services/themeService'; // Assumindo a existência
import { getStudents, Student } from '../services/studentService';
import { createEssayForStudent } from '../services/essayService'; // Nova função de serviço
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { paths } from '@/routes/paths';

interface EssayFormData {
  themeId: string;
  studentId: string; // Apenas para professores
  file: FileList;
}

export function NovaRedacaoPage() {
  const { auth, isLoading } = useAuth();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EssayFormData>();
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTeacher = auth.role === 'teacher';

  const fetchData = useCallback(async () => {
    try {
      const [themesData, studentsData] = await Promise.all([
        getThemes({ limit: 500, active: true }),
        isTeacher ? getStudents({ limit: 1000, active: true }) : Promise.resolve(null)
      ]);
      
      setThemes(themesData.themes);
      if (studentsData) {
        setStudents(studentsData.users);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados necessários.");
      console.error(error);
    }
  }, [isTeacher]);

  useEffect(() => {
    if (!isLoading && auth.isAuthenticated) {
      fetchData();
    }
  }, [isLoading, auth.isAuthenticated, fetchData]);

  const onSubmit = async (data: EssayFormData) => {
    setIsSubmitting(true);
    try {
      const file = data.file[0];
      if (!file) {
        toast.error("Por favor, selecione um arquivo PDF.");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('themeId', data.themeId);
      formData.append('file', file);

      if (isTeacher) {
        if (!data.studentId) {
          toast.error("Por favor, selecione um aluno.");
          setIsSubmitting(false);
          return;
        }
        // A API espera `studentId` no corpo do FormData para professores
        await createEssayForStudent(data.studentId, formData);
        toast.success(`Redação para o aluno selecionado enviada com sucesso!`);
      } else {
        // Para alunos, o studentId é inferido no backend a partir do token
        await essayService.createEssay(formData);
        toast.success("Sua redação foi enviada com sucesso!");
      }
      
      reset();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao enviar a redação.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={paths.loginAluno} />;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Enviar Nova Redação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {isTeacher && (
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
                <Select onValueChange={(value) => setValue('studentId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student._id} value={student._id}>{student.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-red-500 text-sm mt-1">Selecione um aluno.</p>}
              </div>
            )}

            <div>
              <label htmlFor="themeId" className="block text-sm font-medium text-gray-700 mb-1">Tema da Redação</label>
              <Select onValueChange={(value) => setValue('themeId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme._id} value={theme._id}>{theme.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.themeId && <p className="text-red-500 text-sm mt-1">Selecione um tema.</p>}
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">Arquivo da Redação (PDF)</label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                {...register('file', { required: 'O arquivo da redação é obrigatório' })}
              />
              {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Enviando...' : 'Enviar Redação'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}