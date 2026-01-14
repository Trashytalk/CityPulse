// apps/api/src/lib/geo.ts
import * as h3 from 'h3-js';

// Default H3 resolution for coverage tracking
export const H3_RESOLUTION = 9;

/**
 * Get H3 index for coordinates
 */
export function getH3Index(lat: number, lng: number, resolution = H3_RESOLUTION): string {
  return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Get H3 indexes for a bounding box
 */
export function getH3IndexesInBounds(
  north: number,
  south: number,
  east: number,
  west: number,
  resolution = H3_RESOLUTION
): string[] {
  // Create polygon from bounds
  const polygon: [number, number][] = [
    [north, west],
    [north, east],
    [south, east],
    [south, west],
    [north, west], // Close the polygon
  ];
  
  return h3.polygonToCells(polygon, resolution);
}

/**
 * Get polygon coordinates for H3 cell
 */
export function getH3Boundary(h3Index: string): [number, number][] {
  const boundary = h3.cellToBoundary(h3Index);
  // h3-js returns [lat, lng], convert to [lng, lat] for GeoJSON
  return boundary.map(([lat, lng]) => [lng, lat]);
}

/**
 * Get center coordinates for H3 cell
 */
export function getH3Center(h3Index: string): { lat: number; lng: number } {
  const [lat, lng] = h3.cellToLatLng(h3Index);
  return { lat, lng };
}

/**
 * Get neighboring H3 cells
 */
export function getH3Neighbors(h3Index: string, rings = 1): string[] {
  return h3.gridDisk(h3Index, rings);
}

/**
 * Calculate distance between two points (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if point is within bounding box
 */
export function isPointInBounds(
  lat: number,
  lng: number,
  north: number,
  south: number,
  east: number,
  west: number
): boolean {
  return lat <= north && lat >= south && lng <= east && lng >= west;
}

/**
 * Convert H3 cells to GeoJSON FeatureCollection
 */
export function h3ToGeoJSON(
  cells: Array<{ h3Index: string; properties: Record<string, unknown> }>
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature',
      id: cell.h3Index,
      properties: cell.properties,
      geometry: {
        type: 'Polygon',
        coordinates: [getH3Boundary(cell.h3Index)],
      },
    })),
  };
}
