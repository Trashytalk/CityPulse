# apps/ml-service/utils/geo.py
"""
Geospatial Utilities
"""

from typing import Any
import math


class GeoUtils:
    """Geospatial utility functions for CityPulse."""
    
    EARTH_RADIUS_M = 6371000  # Earth radius in meters
    
    @staticmethod
    def haversine_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float,
    ) -> float:
        """
        Calculate distance between two points in meters.
        
        Uses Haversine formula for great-circle distance.
        """
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return GeoUtils.EARTH_RADIUS_M * c
    
    @staticmethod
    def bearing(
        lat1: float, lon1: float,
        lat2: float, lon2: float,
    ) -> float:
        """Calculate bearing from point 1 to point 2 in degrees."""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = (
            math.cos(lat1_rad) * math.sin(lat2_rad) -
            math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        )
        
        bearing = math.atan2(x, y)
        return (math.degrees(bearing) + 360) % 360
    
    @staticmethod
    def destination_point(
        lat: float, lon: float,
        distance: float, bearing: float,
    ) -> tuple[float, float]:
        """
        Calculate destination point given start, distance and bearing.
        
        Args:
            lat, lon: Starting point coordinates
            distance: Distance in meters
            bearing: Bearing in degrees
            
        Returns:
            Tuple of (lat, lon) for destination
        """
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        bearing_rad = math.radians(bearing)
        
        angular_distance = distance / GeoUtils.EARTH_RADIUS_M
        
        dest_lat = math.asin(
            math.sin(lat_rad) * math.cos(angular_distance) +
            math.cos(lat_rad) * math.sin(angular_distance) * math.cos(bearing_rad)
        )
        
        dest_lon = lon_rad + math.atan2(
            math.sin(bearing_rad) * math.sin(angular_distance) * math.cos(lat_rad),
            math.cos(angular_distance) - math.sin(lat_rad) * math.sin(dest_lat)
        )
        
        return (math.degrees(dest_lat), math.degrees(dest_lon))
    
    @staticmethod
    def bounding_box(
        lat: float, lon: float,
        radius_m: float,
    ) -> dict[str, float]:
        """
        Calculate bounding box around point.
        
        Returns:
            Dict with north, south, east, west bounds
        """
        # Approximate degrees per meter
        lat_delta = radius_m / 111000
        lon_delta = radius_m / (111000 * math.cos(math.radians(lat)))
        
        return {
            "north": lat + lat_delta,
            "south": lat - lat_delta,
            "east": lon + lon_delta,
            "west": lon - lon_delta,
        }
    
    @staticmethod
    def point_in_bbox(
        lat: float, lon: float,
        bbox: dict[str, float],
    ) -> bool:
        """Check if point is within bounding box."""
        return (
            bbox["south"] <= lat <= bbox["north"] and
            bbox["west"] <= lon <= bbox["east"]
        )
    
    @staticmethod
    def simplify_path(
        points: list[tuple[float, float]],
        tolerance: float = 10,
    ) -> list[tuple[float, float]]:
        """
        Simplify GPS path using Douglas-Peucker algorithm.
        
        Args:
            points: List of (lat, lon) tuples
            tolerance: Simplification tolerance in meters
            
        Returns:
            Simplified list of points
        """
        if len(points) <= 2:
            return points
        
        # Find point with maximum distance from line
        max_distance = 0
        max_index = 0
        
        start = points[0]
        end = points[-1]
        
        for i in range(1, len(points) - 1):
            distance = GeoUtils._perpendicular_distance(points[i], start, end)
            if distance > max_distance:
                max_distance = distance
                max_index = i
        
        # If max distance is greater than tolerance, recursively simplify
        if max_distance > tolerance:
            left = GeoUtils.simplify_path(points[:max_index + 1], tolerance)
            right = GeoUtils.simplify_path(points[max_index:], tolerance)
            return left[:-1] + right
        else:
            return [start, end]
    
    @staticmethod
    def _perpendicular_distance(
        point: tuple[float, float],
        line_start: tuple[float, float],
        line_end: tuple[float, float],
    ) -> float:
        """Calculate perpendicular distance from point to line."""
        # Approximate using Cartesian math (good enough for small distances)
        x0, y0 = point
        x1, y1 = line_start
        x2, y2 = line_end
        
        numerator = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        denominator = math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
        
        if denominator == 0:
            return 0
        
        # Convert degrees to approximate meters
        return numerator / denominator * 111000
