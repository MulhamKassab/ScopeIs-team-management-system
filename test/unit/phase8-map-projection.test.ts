import { describe, expect, it } from "vitest";
import { coordinateAtPixel, fitMapCoordinates, mapPosition, panMap, visibleMapTiles, worldPixel } from "@/modules/maps/map-projection";

describe("Phase 8 map geometry", () => {
  const centre = { latitude: 0, longitude: 0 };
  const viewport = { width: 512, height: 512 };

  it("aligns known equator coordinates with their raster tile pixels", () => {
    expect(worldPixel(centre, 2)).toEqual({ x: 512, y: 512 });
    expect(worldPixel({ latitude: 0, longitude: 90 }, 2)).toEqual({ x: 768, y: 512 });
    expect(coordinateAtPixel({ x: 768, y: 512 }, 2)).toEqual({ latitude: 0, longitude: 90 });
    expect(mapPosition({ latitude: 0, longitude: 90 }, centre, 2, viewport)).toEqual({ x: 512, y: 256 });
    expect(visibleMapTiles(centre, 2, viewport)).toContainEqual({ key: "2:3:2", x: 3, y: 2, left: 512, top: 256 });
  });

  it("doubles both geographic offsets when zoom increases and retains fractional tile alignment", () => {
    const dubai = { latitude: 25.2048, longitude: 55.2708 };
    const site = { latitude: 25.21, longitude: 55.29 };
    const first = mapPosition(site, dubai, 11, viewport);
    const second = mapPosition(site, dubai, 12, viewport);
    expect(second.x - 256).toBeCloseTo(2 * (first.x - 256), 7);
    expect(second.y - 256).toBeCloseTo(2 * (first.y - 256), 7);
    const world = worldPixel(site, 11);
    const tile = visibleMapTiles(dubai, 11, viewport).find((tile) => tile.x === Math.floor(world.x / 256) && tile.y === Math.floor(world.y / 256))!;
    expect(tile.left + world.x % 256).toBeCloseTo(first.x, 7);
    expect(tile.top + world.y % 256).toBeCloseTo(first.y, 7);
  });

  it("moves overlays by exactly the pointer distance at every zoom and viewport", () => {
    const dubai = { latitude: 25.2048, longitude: 55.2708 };
    for (const zoom of [3, 11, 18]) {
      for (const size of [{ width: 360, height: 330 }, { width: 1180, height: 440 }]) {
        const moved = panMap(dubai, zoom, 30, 20);
        const point = mapPosition(dubai, moved, zoom, size);
        expect(point.x).toBeCloseTo(size.width / 2 + 30, 5);
        expect(point.y).toBeCloseTo(size.height / 2 + 20, 5);
      }
    }
  });

  it("covers a wide viewport and keeps polar and antimeridian tile requests valid", () => {
    const tiles = visibleMapTiles(centre, 3, { width: 1180, height: 440 });
    expect(Math.min(...tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((tile) => tile.left + 256))).toBeGreaterThanOrEqual(1180);
    for (const coordinate of [{ latitude: 90, longitude: 180 }, { latitude: -90, longitude: -180 }]) {
      const point = worldPixel(coordinate, 3);
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
      expect(visibleMapTiles(coordinate, 3, viewport).every((tile) => tile.x >= 0 && tile.x < 8 && tile.y >= 0 && tile.y < 8)).toBe(true);
    }
    const across = mapPosition({ latitude: 0, longitude: -179.99 }, { latitude: 0, longitude: 179.99 }, 3, viewport);
    expect(across.x - 256).toBeCloseTo(0.02 / 360 * 2048);
  });

  it.each([{ width: 288, height: 320 }, { width: 720, height: 560 }, { width: 1500, height: 640 }])("fits every planning point with room for markers at $width px", (size) => {
    for (const coordinates of [
      [{ latitude: 25.2048, longitude: 55.2708 }, { latitude: 25.245, longitude: 55.31 }, { latitude: 25.2, longitude: 55.27 }],
      [{ latitude: 0, longitude: 179.8 }, { latitude: 0, longitude: -179.8 }],
      [{ latitude: 25.2, longitude: 55.27 }, { latitude: 25.2, longitude: 55.27 }],
    ]) {
      const camera = fitMapCoordinates(coordinates, size, 48);
      for (const coordinate of coordinates) {
        const point = mapPosition(coordinate, camera.centre, camera.zoom, size);
        expect(point.x).toBeGreaterThanOrEqual(48 - 0.01);
        expect(point.x).toBeLessThanOrEqual(size.width - 48 + 0.01);
        expect(point.y).toBeGreaterThanOrEqual(48 - 0.01);
        expect(point.y).toBeLessThanOrEqual(size.height - 48 + 0.01);
      }
    }
  });

  it("fits the short interval across the dateline and handles an empty coordinate set", () => {
    const camera = fitMapCoordinates([{ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }], viewport);
    expect(Math.abs(camera.centre.longitude)).toBeCloseTo(180);
    expect(camera.zoom).toBeGreaterThan(8);
    expect(fitMapCoordinates([], viewport)).toEqual({ centre: { latitude: 25.2048, longitude: 55.2708 }, zoom: 11 });
  });
});
