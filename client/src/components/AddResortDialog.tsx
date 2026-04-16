import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Navigation, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CreateResortInput, Resort } from "@/services/resortService";

const DEFAULT_CENTER: L.LatLngExpression = [46.8, 8.2];
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 10;

type CoordinatePair = {
  latitude: number;
  longitude: number;
};

type AddResortDialogProps = {
  open: boolean;
  resortName: string;
  isAdding: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onResortNameChange: (name: string) => void;
  onAdd: (resort: CreateResortInput) => Promise<Resort | null>;
};

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

function parseCoordinate(value: string, min: number, max: number) {
  const trimmed = value.trim();
  if (!trimmed || !/^-?(?:\d+|\d*\.\d+)$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;

  return parsed;
}

function getCoordinatePair(latitude: string, longitude: string): CoordinatePair | null {
  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  const parsedLongitude = parseCoordinate(longitude, -180, 180);

  if (parsedLatitude === null || parsedLongitude === null) return null;

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function hasCoordinateInput(latitude: string, longitude: string) {
  return latitude.trim().length > 0 || longitude.trim().length > 0;
}

function createMarkerIcon() {
  return L.divIcon({
    className: "shred-day-resort-marker",
    html: `<svg viewBox="0 0 24 34" width="24" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z" fill="#111827"/>
      <circle cx="12" cy="11" r="5" fill="white"/>
    </svg>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
  });
}

export function AddResortDialog({
  open,
  resortName,
  isAdding,
  disabled = false,
  onOpenChange,
  onResortNameChange,
  onAdd,
}: AddResortDialogProps) {
  const isMobile = useIsMobile();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const coordinatePair = useMemo(
    () => getCoordinatePair(latitude, longitude),
    [latitude, longitude]
  );
  const coordinateError = useMemo(() => {
    if (!hasCoordinateInput(latitude, longitude)) return null;
    if (!latitude.trim() || !longitude.trim()) return "Enter both latitude and longitude.";
    if (!coordinatePair) return "Enter latitude from -90 to 90 and longitude from -180 to 180.";

    return null;
  }, [coordinatePair, latitude, longitude]);

  const updateMarker = useCallback((lat: number, lng: number, centerMap = false) => {
    setLatitude(formatCoordinate(lat));
    setLongitude(formatCoordinate(lng));

    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: createMarkerIcon(),
      }).addTo(map);
    }

    if (centerMap) {
      map.setView([lat, lng], Math.max(map.getZoom(), PIN_ZOOM));
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setLatitude("");
    setLongitude("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (event: L.LeafletMouseEvent) => {
        updateMarker(event.latlng.lat, event.latlng.lng);
      });

      mapInstanceRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 100);
    }, isMobile ? 300 : 0);

    return () => {
      window.clearTimeout(timer);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isMobile, open, updateMarker]);

  const handleCoordinateBlur = () => {
    if (!coordinatePair) return;

    updateMarker(coordinatePair.latitude, coordinatePair.longitude, true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = resortName.trim();
    if (!trimmedName || coordinateError || disabled || isAdding) return;

    await onAdd({
      name: trimmedName,
      ...(coordinatePair
        ? {
            latitude: coordinatePair.latitude,
            longitude: coordinatePair.longitude,
          }
        : {}),
    });
  };

  const submitLabel = resortName.trim() ? `Add ${resortName.trim()}` : "Add resort";
  const isSubmitDisabled = disabled || isAdding || !resortName.trim() || Boolean(coordinateError);

  const fields = (
    <div className="space-y-4 overflow-y-auto px-4 md:px-0">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-600" htmlFor="new-resort-name">
          Resort name
        </label>
        <Input
          id="new-resort-name"
          placeholder="Resort name"
          value={resortName}
          onChange={(event) => onResortNameChange(event.target.value)}
          disabled={disabled || isAdding}
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <MapPin className="h-3.5 w-3.5" />
          Location
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <p className="mb-2 text-xs text-slate-500">Pick a spot on the map to set the resort location</p>
        <div
          ref={mapRef}
          className="h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          data-testid="add-resort-map"
        />
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Navigation className="h-3.5 w-3.5" />
          Or enter coordinates
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            onBlur={handleCoordinateBlur}
            disabled={disabled || isAdding}
            aria-invalid={Boolean(coordinateError)}
            aria-describedby={coordinateError ? "new-resort-coordinate-error" : undefined}
            data-testid="new-resort-latitude"
          />
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            onBlur={handleCoordinateBlur}
            disabled={disabled || isAdding}
            aria-invalid={Boolean(coordinateError)}
            aria-describedby={coordinateError ? "new-resort-coordinate-error" : undefined}
            data-testid="new-resort-longitude"
          />
        </div>
        {coordinateError ? (
          <p className="mt-2 text-xs text-red-600" id="new-resort-coordinate-error">
            {coordinateError}
          </p>
        ) : null}
      </div>
    </div>
  );

  const buttonContent = isAdding ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Adding...
    </>
  ) : (
    <>
      <Plus className="mr-2 h-4 w-4" />
      {submitLabel}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} modal handleOnly>
        <DrawerContent className="max-h-[90vh]" onPointerDownOutside={(event) => event.preventDefault()}>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">Add new resort</DrawerTitle>
            <DrawerDescription className="sr-only">
              Add a resort name and optional location.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit}>
            {fields}
            <DrawerFooter className="pt-4">
              <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                {buttonContent}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new resort</DialogTitle>
          <DialogDescription className="sr-only">
            Add a resort name and optional location.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields}
          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {buttonContent}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
