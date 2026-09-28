import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesPanel, clearEventNotes } from './NotesPanel';

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
    expect(screen.getByText('SCRATCHPAD')).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Shared scratchpad/i)
    ).toBeDefined();
  });

  test('loads saved notes from localStorage on mount (global/default key)', () => {
    // New format includes timestamp and uses 'brace-notes-global' key
    const stored = JSON.stringify({ value: 'My algorithm strategy notes', timestamp: Date.now() });
    localStorage.setItem('brace-notes-global', stored);
    render(<NotesPanel isOpen={true} />);
    const textarea = screen.getByPlaceholderText(/Shared scratchpad/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('My algorithm strategy notes');
  });

  test('updates text and saves to localStorage on typing', () => {
    render(<NotesPanel isOpen={true} />);
    const textarea = screen.getByPlaceholderText(/Shared scratchpad/i);
    fireEvent.change(textarea, { target: { value: 'New test note' } });

    const stored = JSON.parse(localStorage.getItem('brace-notes-global') || '{}');
    expect(stored.value).toBe('New test note');
    expect(stored.timestamp).toBeDefined();
  });

  test('triggers onClose callback when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<NotesPanel isOpen={true} onClose={handleClose} />);
    
    const closeBtn = screen.getByLabelText('Close notes panel');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('supports eventId scoping and multi-problem tabs', () => {
    const problems = [
      { id: 'p1', name: 'Two Sum' },
      { id: 'p2', name: 'Reverse Linked List' },
    ];
    render(<NotesPanel isOpen={true} eventId="ev123" problems={problems} />);

    expect(screen.getByText('BATTLE NOTES')).toBeDefined();
    expect(screen.getByText('COMMON')).toBeDefined();
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();

    // Type into COMMON
    const commonTextarea = screen.getByPlaceholderText(/Shared scratchpad/i);
    fireEvent.change(commonTextarea, { target: { value: 'Common notes' } });
    
    const commonStored = JSON.parse(localStorage.getItem('brace-notes-common-ev123') || '{}');
    expect(commonStored.value).toBe('Common notes');
    expect(commonStored.timestamp).toBeDefined();

    // Switch to P1
    fireEvent.click(screen.getByText('P1'));
    const p1Textarea = screen.getByPlaceholderText(/Notes for: Two Sum/i);
    fireEvent.change(p1Textarea, { target: { value: 'P1 notes' } });
    
    const p1Stored = JSON.parse(localStorage.getItem('brace-notes-problem-p1') || '{}');
    expect(p1Stored.value).toBe('P1 notes');
    expect(p1Stored.timestamp).toBeDefined();

    // clearEventNotes removes both
    clearEventNotes('ev123', ['p1', 'p2']);
    expect(localStorage.getItem('brace-notes-common-ev123')).toBeNull();
    expect(localStorage.getItem('brace-notes-problem-p1')).toBeNull();
  });
});