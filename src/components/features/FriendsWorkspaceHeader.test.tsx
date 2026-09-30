import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FriendsWorkspaceHeader } from './FriendsWorkspaceHeader';
import type { ComponentProps } from 'react';

const noop = () => {};

// Typed off the component itself so a new header prop can't silently leave the
// test rendering it as undefined.
type HeaderProps = ComponentProps<typeof FriendsWorkspaceHeader>;

const baseProps: HeaderProps = {
  searchQuery: '',
  onSearchChange: noop,
  friendCount: 0,
  requestCount: 0,
  pendingRequests: [],
  onAcceptRequest: noop,
  onRejectRequest: noop,
  discoverOpen: false,
  onToggleDiscover: noop,
  discoverResults: [],
  discoverQuery: '',
  onDiscoverQueryChange: noop,
  discoverLoading: false,
  discoverError: null,
  onSendRequest: noop,
  sendingTo: null,
  existingFriendIds: [],
};

const renderHeader = (overrides: Partial<HeaderProps> = {}) => {
  const props: HeaderProps = { ...baseProps, ...overrides };
  return { props, ...render(<FriendsWorkspaceHeader {...props} />) };
};

describe('FriendsWorkspaceHeader — new friend discovery', () => {
  test('exposes a "Find new friends" entry point', () => {
    renderHeader();
    expect(screen.getByLabelText('Find new friends')).toBeInTheDocument();
  });

  test('the entry point reflects its expanded state', () => {
    renderHeader();
    expect(screen.getByLabelText('Find new friends')).toHaveAttribute('aria-expanded', 'false');

    renderHeader({ discoverOpen: true });
    expect(screen.getAllByLabelText('Find new friends')[1]).toHaveAttribute('aria-expanded', 'true');
  });

  test('hides the friend-list filter while discovering', () => {
    renderHeader({ discoverOpen: true });
    expect(screen.queryByPlaceholderText('Search friends')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username…')).toBeInTheDocument();
  });

  test('prompts for more characters below 2 characters', () => {
    renderHeader({ discoverOpen: true, discoverQuery: 'a' });
    expect(
      screen.getByText('Type at least 2 characters to search the operatives directory.'),
    ).toBeInTheDocument();
  });

  test('shows loading, empty and error states for the results panel', () => {
    const { unmount } = renderHeader({ discoverOpen: true, discoverQuery: 'al', discoverLoading: true });
    expect(screen.getByText('Scanning directory…')).toBeInTheDocument();
    unmount();

    renderHeader({ discoverOpen: true, discoverQuery: 'zz' });
    expect(screen.getByText('No operative matches “zz”.')).toBeInTheDocument();
  });

  test('surfaces a search failure instead of an empty list', () => {
    renderHeader({ discoverOpen: true, discoverQuery: 'al', discoverError: 'Directory offline' });
    expect(screen.getByText('Directory offline')).toBeInTheDocument();
  });
});

describe('FriendsWorkspaceHeader — result rows', () => {
  const results = [
    { id: 'u1', username: 'neo' },
    { id: 'u2', username: 'trinity', requestSent: true },
  ];

  test('sends a request with the user id, not the username', () => {
    const onSendRequest = vi.fn();
    renderHeader({ discoverOpen: true, discoverQuery: 'ne', discoverResults: results, onSendRequest });

    fireEvent.click(screen.getByLabelText('Send friend request to neo'));

    expect(onSendRequest).toHaveBeenCalledWith('u1', 'neo');
  });

  test('marks an already-pending request as Requested with no send button', () => {
    renderHeader({ discoverOpen: true, discoverQuery: 'tr', discoverResults: results });

    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send friend request to trinity')).not.toBeInTheDocument();
  });

  test('labels existing friends as Friend with no send button', () => {
    renderHeader({
      discoverOpen: true,
      discoverQuery: 'ne',
      discoverResults: results,
      existingFriendIds: ['u1'],
    });

    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send friend request to neo')).not.toBeInTheDocument();
  });

  test('disables the send button while that request is in flight', () => {
    renderHeader({
      discoverOpen: true,
      discoverQuery: 'ne',
      discoverResults: results,
      sendingTo: 'u1',
    });

    expect(screen.getByLabelText('Send friend request to neo')).toBeDisabled();
  });
});

describe('FriendsWorkspaceHeader — pending requests', () => {
  /** The requests popover is collapsed by default; open it before asserting. */
  const openRequests = () => fireEvent.click(screen.getByLabelText(/^Friend requests/));

  test('accept passes BOTH the request id and the sender id', () => {
    const onAcceptRequest = vi.fn();
    renderHeader({
      requestCount: 1,
      pendingRequests: [{ id: 'req-1', sender: { id: 'sender-9', username: 'morpheus' } }],
      onAcceptRequest,
    });
    openRequests();

    fireEvent.click(screen.getByTitle('Accept request'));

    expect(onAcceptRequest).toHaveBeenCalledWith('req-1', 'sender-9');
  });

  test('does not fire an accept when the sender id is missing', () => {
    const onAcceptRequest = vi.fn();
    renderHeader({
      requestCount: 1,
      pendingRequests: [{ id: 'req-1', sender: { username: 'morpheus' } }],
      onAcceptRequest,
    });
    openRequests();

    fireEvent.click(screen.getByTitle('Accept request'));
    expect(onAcceptRequest).not.toHaveBeenCalled();
  });

  test('rejects by request id', () => {
    const onRejectRequest = vi.fn();
    renderHeader({
      requestCount: 1,
      pendingRequests: [{ id: 'req-1', sender: { id: 'sender-9', username: 'morpheus' } }],
      onRejectRequest,
    });
    openRequests();

    fireEvent.click(screen.getByTitle('Reject request'));
    expect(onRejectRequest).toHaveBeenCalledWith('req-1');
  });

  test('shows the real request count above 9 (badge capped at 99+)', () => {
    renderHeader({ requestCount: 120 });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test('disables BOTH action buttons while a request action is in flight', () => {
    renderHeader({
      requestCount: 1,
      pendingRequests: [{ id: 'req-1', sender: { id: 'sender-9', username: 'morpheus' } }],
      actingRequestId: 'req-1',
    });
    openRequests();

    expect(screen.getByTitle('Accept request')).toBeDisabled();
    expect(screen.getByTitle('Reject request')).toBeDisabled();
  });
});
