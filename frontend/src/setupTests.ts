import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(global as any).URL.createObjectURL = jest.fn(() => 'blob:');
(global as any).URL.revokeObjectURL = jest.fn();
