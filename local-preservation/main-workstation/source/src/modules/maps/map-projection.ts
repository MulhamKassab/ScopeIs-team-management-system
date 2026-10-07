import type { MapCoordinate } from "@/modules/maps/map-adapter";

export const TILE_SIZE = 256;
const MAX_LATITUDE = 85.0511287798066;
type Point = { x: number; y: number };
export type MapViewport = { width: number; height: number };
export type MapCamera = { centre: MapCoordinate; zoom: number };
export const MIN_MAP_ZOOM = 0;
export const MAX_MAP_ZOOM = 18;
const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** OSM raster tiles and every overlay share the same Web Mercator world-pixel space. */
export function worldPixel(coordinate: MapCoordinate, zoom: number): Point {
  const size = TILE_SIZE * 2 ** zoom;
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, coordinate.latitude));
  return {
    x: wrap((coordinate.longitude + 180) / 360 * size, size),
    y: Math.max(0, Math.min(size, (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * size)),
  };
}

export function coordinateAtPixel(point: Point, zoom: number): MapCoordinate {
  const size = TILE_SIZE * 2 ** zoom;
  const y = Math.max(0, Math.min(size, point.y));
  return { longitude: wrap(point.x, size) / size * 360 - 180, latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI };
}

export function mapPosition(coordinate: MapCoordinate, centre: MapCoordinate, zoom: number, viewport: MapViewport): Point {
  const target = worldPixel(coordinate, zoom);
  const origin = worldPixel(centre, zoom);
  const size = TILE_SIZE * 2 ** zoom;
  return { x: viewport.width / 2 + wrap(target.x - origin.x + size / 2, size) - size / 2, y: viewport.height / 2 + target.y - origin.y };
}

export function panMap(centre: MapCoordinate, zoom: number, dx: number, dy: number): MapCoordinate {
  const origin = worldPixel(centre, zoom);
  return coordinateAtPixel({ x: origin.x - dx, y: origin.y - dy }, zoom);
}

/** Fit the smallest geographic interval, including views that cross the antimeridian. */
export function fitMapCoordinates(coordinates: MapCoordinate[], viewport: MapViewport, padding = 64): MapCamera {
  if (!coordinates.length) return { centre: { latitude: 25.2048, longitude: 55.2708 }, zoom: 11 };
  const points = coordinates.map((coordinate) => worldPixel(coordinate, 0));
  const xs = points.map((point) => point.x).sort((a, b) => a - b);
  let largestGap = -1;
  let start = xs[0];
  for (let index = 0; index < xs.length; index++) {
    const next = xs[(index + 1) % xs.length] + (index === xs.length - 1 ? TILE_SIZE : 0);
    if (next - xs[index] > largestGap) { largestGap = next - xs[index]; start = next % TILE_SIZE; }
  }
  const width = TILE_SIZE - largestGap;
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  const scale = Math.min(
    width > 0 ? Math.max(1, viewport.width - padding * 2) / width : Infinity,
    bottom > top ? Math.max(1, viewport.height - padding * 2) / (bottom - top) : Infinity,
  );
  return {
    centre: coordinateAtPixel({ x: start + width / 2, y: (top + bottom) / 2 }, 0),
    zoom: Math.max(MIN_MAP_ZOOM, Math.min(15, Math.floor(Math.log2(scale)))),
  };
}

export function visibleMapTiles(centre: MapCoordinate, zoom: number, viewport: MapViewport) {
  const origin = worldPixel(centre, zoom);
  const count = 2 ** zoom;
  const left = origin.x - viewport.width / 2;
  const top = origin.y - viewport.height / 2;
  const result: Array<{ key: string; x: number; y: number; left: number; top: number }> = [];
  for (let y = Math.max(0, Math.floor(top / TILE_SIZE)); y <= Math.min(count - 1, Math.floor((top + viewport.height) / TILE_SIZE)); y++) {
    for (let x = Math.floor(left / TILE_SIZE); x <= Math.floor((left + viewport.width) / TILE_SIZE); x++) {
      result.push({ key: `${zoom}:${x}:${y}`, x: wrap(x, count), y, left: x * TILE_SIZE - left, top: y * TILE_SIZE - top });
    }
  }
  return result;
}
