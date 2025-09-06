import { render, screen } from '@testing-library/react';
import React from 'react';

function Hello() {
  return <h1>Olá, Yago!</h1>;
}

test('renderiza', () => {
  render(<Hello />);
  expect(screen.getByText('Olá, Yago!')).toBeInTheDocument();
});
