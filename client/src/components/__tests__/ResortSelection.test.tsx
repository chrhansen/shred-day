// @jest-environment jsdom
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ResortSelection } from '../ResortSelection';
import type { Resort } from '@/services/resortService';

jest.mock('@/components/AddResortDialog', () => ({
  AddResortDialog: ({
    open,
    resortName,
    onResortNameChange,
    onAdd,
  }: {
    open: boolean;
    resortName: string;
    onResortNameChange: (name: string) => void;
    onAdd: (data: { name: string; latitude?: number; longitude?: number }) => Promise<Resort | null>;
  }) =>
    open ? (
      <div role="dialog" aria-label="Add new resort">
        <input
          placeholder="Resort name"
          value={resortName}
          onChange={(event) => onResortNameChange(event.target.value)}
        />
        <button type="button" onClick={() => onAdd({ name: resortName })}>
          Add mocked resort
        </button>
      </div>
    ) : null,
}));

describe('ResortSelection', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {},
    });
  });

  it('offers and submits a new resort suggestion when no results match', async () => {
    const user = userEvent.setup();
    const createdResort: Resort = {
      id: 'res_1',
      name: 'unknown resort',
      country: null,
      region: null,
      latitude: null,
      longitude: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const onCreateResort = jest.fn().mockResolvedValue(createdResort);

    render(
      <ResortSelection
        selectedResort={null}
        recentResorts={[]}
        isLoadingRecentResorts={false}
        isSearchingMode={true}
        resortQuery="unknown resort"
        searchResults={[]}
        isSearchingResorts={false}
        activeSearchIndex={-1}
        isDisabled={false}
        onToggleRecent={jest.fn()}
        onSearchModeToggle={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectFromSearch={jest.fn()}
        onSearchIndexChange={jest.fn()}
        onCreateResort={onCreateResort}
        isCreatingResort={false}
      />
    );

    expect(screen.getByText(/no resorts found/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(
        screen.getByRole('button', { name: /add "unknown resort" as new resort/i })
      );
    });

    const resortNameInput = screen.getByPlaceholderText('Resort name');
    expect(resortNameInput).toHaveValue('unknown resort');

    const addButton = screen.getByRole('button', { name: /^add mocked resort$/i });
    await act(async () => {
      await user.click(addButton);
    });

    await waitFor(() => {
      expect(onCreateResort).toHaveBeenCalledWith({
        name: 'unknown resort',
      });
    });
  });

  it('shows add-resort action even when search results exist', async () => {
    const user = userEvent.setup();
    const resorts: Resort[] = [
      {
        id: 'res_2',
        name: 'Stubai Glacier',
        country: 'Austria',
        region: 'Tyrol',
        latitude: 47.0,
        longitude: 11.1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <ResortSelection
        selectedResort={null}
        recentResorts={[]}
        isLoadingRecentResorts={false}
        isSearchingMode={true}
        resortQuery="st"
        searchResults={resorts}
        isSearchingResorts={false}
        activeSearchIndex={-1}
        isDisabled={false}
        onToggleRecent={jest.fn()}
        onSearchModeToggle={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectFromSearch={jest.fn()}
        onSearchIndexChange={jest.fn()}
        onCreateResort={jest.fn().mockResolvedValue(null)}
        isCreatingResort={false}
      />
    );

    expect(screen.getByTestId('resort-search-results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add "st" as new resort/i })).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add "st" as new resort/i }));
    });

    expect(screen.getByRole('dialog', { name: /add new resort/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Resort name')).toHaveValue('st');
  });
});
