import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from '@/components/Avatar';

describe('Avatar', () => {
  it('shows initials when image fails', () => {
    render(<Avatar src='bad.jpg' name='John Doe' />);
    const img = screen.getByAltText('John Doe') as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
