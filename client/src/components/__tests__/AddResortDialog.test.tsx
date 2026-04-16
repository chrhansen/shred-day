// @jest-environment jsdom
import { act } from 'react';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import L from 'leaflet';
import { AddResortDialog } from '../AddResortDialog';
import type { Resort } from '@/services/resortService';

type LeafletMockState = {
  clickHandler: ((event: { latlng: { lat: number; lng: number } }) => void) | null;
  setView: jest.Mock;
  setLatLng: jest.Mock;
};

jest.mock('leaflet/dist/leaflet.css', () => ({}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <>{children}</> : null),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog" aria-label="Add new resort">
      {children}
    </div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <>{children}</> : null),
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

jest.mock('leaflet', () => ({
  __esModule: true,
  default: (() => {
    const state = {
      clickHandler: null as ((event: { latlng: { lat: number; lng: number } }) => void) | null,
      setView: jest.fn(),
      setLatLng: jest.fn(),
    };
    (globalThis as typeof globalThis & { __leafletMockState: typeof state }).__leafletMockState = state;

    return {
      map: jest.fn(() => {
        const map = {
          on: jest.fn((eventName: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => {
            if (eventName === 'click') state.clickHandler = handler;
            return map;
          }),
          remove: jest.fn(),
          setView: state.setView,
          getZoom: jest.fn(() => 5),
          invalidateSize: jest.fn(),
        };
        return map;
      }),
      control: {
        zoom: jest.fn(() => ({
          addTo: jest.fn(),
        })),
      },
      tileLayer: jest.fn(() => ({
        addTo: jest.fn(),
      })),
      marker: jest.fn(() => {
        const marker = {
          addTo: jest.fn(() => marker),
          setLatLng: state.setLatLng,
        };
        return marker;
      }),
      divIcon: jest.fn((options) => options),
    };
  })(),
}));

function getLeafletState() {
  const state = (globalThis as typeof globalThis & { __leafletMockState?: LeafletMockState }).__leafletMockState;
  if (!state) throw new Error('Leaflet mock state missing');

  return state;
}

describe('AddResortDialog', () => {
  const createdResort: Resort = {
    id: 'res_1',
    name: 'New resort',
    country: null,
    region: null,
    latitude: null,
    longitude: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getLeafletState().clickHandler = null;
  });

  it('syncs map clicks into coordinate inputs and submits them', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockResolvedValue(createdResort);

    render(
      <AddResortDialog
        open
        resortName="New resort"
        isAdding={false}
        onOpenChange={jest.fn()}
        onResortNameChange={jest.fn()}
        onAdd={onAdd}
      />
    );

    await waitFor(() => expect(L.map).toHaveBeenCalled());
    const leafletState = getLeafletState();
    expect(leafletState.clickHandler).toBeTruthy();

    act(() => {
      leafletState.clickHandler?.({ latlng: { lat: 47.123456, lng: 11.654321 } });
    });

    expect(screen.getByTestId('new-resort-latitude')).toHaveValue('47.12346');
    expect(screen.getByTestId('new-resort-longitude')).toHaveValue('11.65432');

    await user.click(screen.getByRole('button', { name: /add new resort/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: 'New resort',
        latitude: 47.12346,
        longitude: 11.65432,
      });
    });
  });

  it('moves the map pin when valid coordinates are entered', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockResolvedValue(createdResort);

    render(
      <AddResortDialog
        open
        resortName="Coordinate resort"
        isAdding={false}
        onOpenChange={jest.fn()}
        onResortNameChange={jest.fn()}
        onAdd={onAdd}
      />
    );

    await waitFor(() => expect(L.map).toHaveBeenCalled());

    await act(async () => {
      await user.type(screen.getByTestId('new-resort-latitude'), '46.5001');
      await user.type(screen.getByTestId('new-resort-longitude'), '11.2002');
      await user.tab();
    });

    expect(L.marker).toHaveBeenCalledWith([46.5001, 11.2002], expect.any(Object));
    expect(getLeafletState().setView).toHaveBeenCalledWith([46.5001, 11.2002], 10);

    await user.click(screen.getByRole('button', { name: /add coordinate resort/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: 'Coordinate resort',
        latitude: 46.5001,
        longitude: 11.2002,
      });
    });
  });

  it('submits without location when coordinates are blank', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockResolvedValue(createdResort);

    render(
      <AddResortDialog
        open
        resortName="No pin resort"
        isAdding={false}
        onOpenChange={jest.fn()}
        onResortNameChange={jest.fn()}
        onAdd={onAdd}
      />
    );

    await user.click(screen.getByRole('button', { name: /add no pin resort/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: 'No pin resort',
      });
    });
  });
});
