import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { TextEncoder, TextDecoder } from 'util';

// Configurar jest-axe
expect.extend(toHaveNoViolations);

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(global as any).URL.createObjectURL = jest.fn(() => 'blob:');
(global as any).URL.revokeObjectURL = jest.fn();
