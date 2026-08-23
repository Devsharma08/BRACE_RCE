import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorToolbar from './EditorToolbar';
import { CodeContext } from '../../../context/CodeContext';

const mockContextValue = {
  code: '// test code',
  setCode: vi.fn(),
  language: 'javascript' as const,
  setLanguage: vi.fn(),
  testCases: [],
  setTestCases: vi.fn(),
  activeFile: 'file-1',
  setActiveFile: vi.fn(),
  output: null,
  setOutput: vi.fn(),
  customInput: '',
  setCustomInput: vi.fn(),
  customInputActive: false,
  setCustomInputActive: vi.fn(),
};

describe('EditorToolbar Component', () => {
  const defaultProps = {
    disabled: false,
    activeFile: 'problem-1',
    fileName: 'two-sum.js',
    language: 'javascript' as const,
    executingMode: null,
    setLanguage: vi.fn(),
    setCode: vi.fn(),
    onRun: vi.fn(),
    onFormat: vi.fn(),
    onReset: vi.fn(),
    sidebarWidth: 360,
    setSidebarWidth: vi.fn(),
    onToggleNotes: vi.fn(),
    isNotesOpen: false,
    onExit: vi.fn(),
  };

  const renderToolbar = (props = defaultProps) => {
    return render(
      <MemoryRouter>
        <CodeContext.Provider value={mockContextValue}>
          <EditorToolbar {...props} />
        </CodeContext.Provider>
      </MemoryRouter>
    );
  };

  test('renders active file name', () => {
    renderToolbar();
    const input = screen.getByLabelText('File name') as HTMLInputElement;
    expect(input.value).toBe('two-sum.js');
  });

  test('calls onFormat when format button is clicked', () => {
    const handleFormat = vi.fn();
    renderToolbar({ ...defaultProps, onFormat: handleFormat });

    const formatBtn = screen.getByTitle('Format active code');
    fireEvent.click(formatBtn);

    expect(handleFormat).toHaveBeenCalledTimes(1);
  });

  test('calls onToggleNotes when notes button is clicked', () => {
    const handleToggleNotes = vi.fn();
    renderToolbar({ ...defaultProps, onToggleNotes: handleToggleNotes });

    const notesBtn = screen.getByTitle('Toggle Global Scratchpad Notes');
    fireEvent.click(notesBtn);

    expect(handleToggleNotes).toHaveBeenCalledTimes(1);
  });

  test('calls onExit when exit button is clicked', () => {
    const handleExit = vi.fn();
    renderToolbar({ ...defaultProps, onExit: handleExit });

    const exitBtn = screen.getByTitle('Exit to Dashboard / Home');
    fireEvent.click(exitBtn);

    expect(handleExit).toHaveBeenCalledTimes(1);
  });
});
