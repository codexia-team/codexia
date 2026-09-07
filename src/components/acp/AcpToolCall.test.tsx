import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AcpEntry } from '@/stores/useAcpStore';
import { AcpToolCall } from './AcpToolCall';

type ToolEntry = Extract<AcpEntry, { role: 'tool' }>;

function toolEntry(overrides: Partial<ToolEntry>): ToolEntry {
  return {
    id: 't1',
    role: 'tool',
    toolCallId: 'call-1',
    title: 'Run command',
    status: 'completed',
    ...overrides,
  } as ToolEntry;
}

describe('AcpToolCall', () => {
  it('shows the command of a shell call that already has output', () => {
    render(
      <AcpToolCall
        entry={toolEntry({
          kind: 'execute',
          rawInput: { command: 'ls -la' },
          content: [{ type: 'content', content: { type: 'text', text: 'total 0' } }],
        })}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/ls -la/)).toBeTruthy();
    expect(screen.getByText(/total 0/)).toBeTruthy();
  });

  it('joins an argv-style command', () => {
    render(
      <AcpToolCall
        entry={toolEntry({ kind: 'execute', rawInput: { command: ['bash', '-lc', 'echo hi'] } })}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/bash -lc echo hi/)).toBeTruthy();
  });

  it('falls back to the raw input when the call is not a command', () => {
    render(<AcpToolCall entry={toolEntry({ kind: 'read', rawInput: { path: '/tmp/a.txt' } })} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/\/tmp\/a.txt/)).toBeTruthy();
  });
});
