jest.mock('axios');
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

jest.mock('../components/Navbar', () => () => <div>Navbar</div>);

describe('App navigation', () => {
  test('renders login professor route', () => {
    render(
      <MemoryRouter initialEntries={['/login-professor']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Login Professor')).toBeInTheDocument();
  });
});
