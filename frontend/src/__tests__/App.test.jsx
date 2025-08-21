jest.mock('@/services/api');
import { render, screen } from '@testing-library/react';
import App from '@/App';

jest.mock('@/components/Navbar', () => () => <div>Navbar</div>);

describe('App navigation', () => {
  test('renders login professor route', () => {
    window.history.pushState({}, '', '/login-professor');
    render(<App />);
    expect(screen.getByText('Login Professor')).toBeInTheDocument();
  });
});

