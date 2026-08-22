import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesPanel } from './NotesPanel';

describe('NotesPanel Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(<NotesPanel isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders header title and scratchpad textarea when isOpen is true', () => {
    render(<NotesPanel isOpen={true} />);
    expect(screen.getByText('GLOBAL SCRATCHPAD')).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Jot down algorithm ideas/i)
    ).toBeDefined();
  });

  test('loads saved notes from localStorage on mount', () => {
    localStorage.setItem('brace-global-notes', 'My algorithm strategy notes');
    render(<NotesPanel isOpen={true} />);
    const textarea = screen.getByPlaceholderText(/Jot down algorithm ideas/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('My algorithm strategy notes');
  });

  test('updates text and saves to localStorage on typing', () => {
    render(<NotesPanel isOpen={true} />);
    const textarea = screen.getByPlaceholderText(/Jot down algorithm ideas/i);
    fireEvent.change(textarea, { target: { value: 'New test note' } });

    expect(localStorage.getItem('brace-global-notes')).toBe('New test note');
  });

  test('triggers onClose callback when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<NotesPanel isOpen={true} onClose={handleClose} />);
    
    const closeBtn = screen.getByTitle('Close Notes');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
