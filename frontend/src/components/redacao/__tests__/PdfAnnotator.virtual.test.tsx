// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PdfAnnotator from '../PdfAnnotator';

// Polyfill rAF para throttles
beforeAll(() => {
  // rAF para throttles
  global.requestAnimationFrame = (cb: any) => setTimeout(cb, 0) as any;
  // Polyfill ResizeObserver
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

jest.mock('react-pdf', () => {
  const React = require('react');
  const { useEffect } = React;
  return {
    Document: ({ children, onLoadSuccess }: any) => {
      useEffect(() => { setTimeout(() => onLoadSuccess?.({ numPages: 3 }), 0); }, []);
      return <div data-testid="doc">{children}</div>;
    },
    Page: ({ pageNumber, width, onLoadSuccess }: any) => {
      useEffect(() => { setTimeout(() => onLoadSuccess?.({ getViewport: () => ({ width: 1000, height: 1400 }) }), 0); }, []);
      return <div data-testid={`page-${pageNumber}`} style={{ width, height: width * 1.4 }} />;
    },
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  };
});

function setup() {
  // Desabilita virtualização para evitar dependências de medida em JSDOM
  (window as any).YS_VIRT_PDF = false;
  const onChange = jest.fn();
  const onPageChange = jest.fn();
  render(
    <div style={{ height: 800 }}>
      <PdfAnnotator src="/dummy.pdf" storageKey="test-key" annos={[]} onChange={onChange} page={1} onPageChange={onPageChange} />
    </div>
  );
  return { onChange, onPageChange };
}

describe('PdfAnnotator - navegação básica pelo cabeçalho', () => {
  it('navega com botões ◀/▶ e atualiza o cabeçalho', async () => {
    const { onPageChange } = setup();

    // Deve mostrar página 1 de 3 inicialmente
    expect(await screen.findByText(/página 1 de 3/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: '▶' });
    const prevBtn = screen.getByRole('button', { name: '◀' });

    // ▶ -> página 2
    await act(async () => {
      fireEvent.click(nextBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument();

    // ▶ -> página 3
    await act(async () => {
      fireEvent.click(nextBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/página 3 de 3/i)).toBeInTheDocument();

    // ▶ além do limite -> continua 3
    await act(async () => {
      fireEvent.click(nextBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/página 3 de 3/i)).toBeInTheDocument();

    // ◀ -> página 2
    await act(async () => {
      fireEvent.click(prevBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument();

    // Deve ter disparado onPageChange algumas vezes
    expect(onPageChange).toHaveBeenCalled();
  });
});
