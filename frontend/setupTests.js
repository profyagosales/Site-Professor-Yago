import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.URL.createObjectURL = jest.fn(() => 'blob:');
global.URL.revokeObjectURL = jest.fn();
process.env.VITE_API_URL = 'http://localhost';

// Router helpers: simple mocks to avoid context errors in tests that render components
jest.mock('@/routes/PrivateRoute', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('@/routes/ProtectedRoute', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('react-router-dom', () => {
	const actual = jest.requireActual('react-router-dom');
	return {
		...actual,
		Link: ({ children, to, ...rest }) => <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>,
	};
});
