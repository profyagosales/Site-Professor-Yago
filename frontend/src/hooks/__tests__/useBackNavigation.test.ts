import { renderHook } from '@testing-library/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBackNavigation } from '../useBackNavigation';

// Mock do react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

describe('useBackNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);
  });

  it('deve retornar ROUTES.prof.resumo quando pathname começa com /professor', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/professor/turmas',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const { result } = renderHook(() => useBackNavigation());

    expect(result.current.goHomeByRole()).toBe('/professor/resumo');
  });

  it('deve retornar ROUTES.aluno.resumo quando pathname começa com /aluno', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/aluno/notas',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const { result } = renderHook(() => useBackNavigation());

    expect(result.current.goHomeByRole()).toBe('/aluno/resumo');
  });

  it('deve retornar ROUTES.home quando pathname não começa com /professor ou /aluno', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const { result } = renderHook(() => useBackNavigation());

    expect(result.current.goHomeByRole()).toBe('/');
  });

  it('deve chamar navigate(-1) quando há histórico', () => {
    // Mock window.history.length > 1
    Object.defineProperty(window, 'history', {
      value: { length: 2 },
      writable: true,
    });

    mockUseLocation.mockReturnValue({
      pathname: '/professor/turmas',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const { result } = renderHook(() => useBackNavigation());

    result.current.handleBack();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('deve chamar navigate com goHomeByRole quando não há histórico', () => {
    // Mock window.history.length = 1
    Object.defineProperty(window, 'history', {
      value: { length: 1 },
      writable: true,
    });

    mockUseLocation.mockReturnValue({
      pathname: '/professor/turmas',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });

    const { result } = renderHook(() => useBackNavigation());

    result.current.handleBack();

    expect(mockNavigate).toHaveBeenCalledWith('/professor/resumo', {
      replace: true,
    });
  });
});
