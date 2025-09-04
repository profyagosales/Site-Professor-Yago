jest.mock('@/lib/api');
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { MemoryRouter } from 'react-router-dom';
// Mock lazy pages used at the route to avoid Suspense loading state
jest.mock('@/pages/Landing', () => () => <div>Landing</div>);
jest.mock('@/pages/auth/LoginProfessor', () => () => (
  <div>Login Professor</div>
));

jest.mock('@/components/Header', () => () => <div>Header</div>);

describe('App navigation', () => {
  test('renders login professor route', async () => {
    window.history.pushState({}, '', '/login-professor');
    render(
      <MemoryRouter initialEntries={['/login-professor']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText('Login Professor')).toBeInTheDocument();
  });
});
