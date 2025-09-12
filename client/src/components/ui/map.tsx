import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MapZone } from "@/types";

interface MapProps {
  height?: string;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  onZoneClick?: (zone: MapZone) => void;
  isAdmin?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function Map({ 
  height = "h-96", 
  onLocationSelect, 
  onZoneClick, 
  isAdmin = false,
  onMapClick 
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data: zones = [], isLoading: zonesLoading } = useQuery<MapZone[]>({
    queryKey: ["/api/zones"],
    retry: false,
  });

  useEffect(() => {
    if (!mapRef.current) return;

    // Cleanup existing map
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.error('Error cleaning up previous map:', error);
      }
      mapInstanceRef.current = null;
    }

    // Wait for Leaflet to be available
    const initializeMap = () => {
      if (typeof window === 'undefined' || !(window as any).L) {
        console.log('Leaflet not available, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }

      const L = (window as any).L;
      
      try {
        // Initialize map with error handling
        const mapContainer = mapRef.current;
        if (!mapContainer) {
          console.error('Map container not found');
          setMapError('Map container not found');
          return;
        }

        if ((mapContainer as any)._leaflet_id) {
          console.log('Map already initialized');
          return;
        }

        console.log('Initializing map...');
        const map = L.map(mapContainer, {
          center: [28.6139, 77.2090],
          zoom: 13,
          zoomControl: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);
        setMapError(null);
        console.log('Map initialized successfully');

        // Add click handler for location selection
        if (onLocationSelect || onMapClick) {
          map.on('click', (e: any) => {
            try {
              const { lat, lng } = e.latlng;
              
              if (onMapClick) {
                onMapClick(lat, lng);
              }

              if (onLocationSelect) {
                // Reverse geocoding simulation
                const address = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                onLocationSelect(lat, lng, address);
              }
            } catch (error) {
              console.error('Error handling map click:', error);
            }
          });
        }

        // Add zones to map
        console.log('Adding zones to map:', zones.length);
        if (zones && zones.length > 0) {
          zones.forEach((zone: MapZone) => {
            try {
              let color = '#22c55e'; // green
              let fillColor = '#22c55e';
              
              if (zone.reportCount >= 15) {
                color = '#ef4444'; // red
                fillColor = '#ef4444';
              } else if (zone.reportCount >= 6) {
                color = '#f97316'; // orange
                fillColor = '#f97316';
              } else if (zone.reportCount >= 4) {
                color = '#eab308'; // yellow
                fillColor = '#eab308';
              }

              console.log(`Adding zone: ${zone.name} at ${zone.latitude}, ${zone.longitude} with ${zone.reportCount} reports`);

              const circle = L.circleMarker([Number(zone.latitude), Number(zone.longitude)], {
                color,
                fillColor,
                fillOpacity: 0.6,
                radius: 12,
                weight: 2
              }).addTo(map);

              // Create popup content safely to prevent XSS
              const popupDiv = document.createElement('div');
              popupDiv.className = 'p-2';
              
              const title = document.createElement('h3');
              title.className = 'font-semibold';
              title.textContent = zone.name;
              
              const reportsP = document.createElement('p');
              reportsP.className = 'text-sm';
              reportsP.textContent = `Reports: ${zone.reportCount}`;
              
              const riskP = document.createElement('p');
              riskP.className = 'text-sm';
              riskP.textContent = `Risk: ${zone.riskLevel}`;
              
              popupDiv.appendChild(title);
              popupDiv.appendChild(reportsP);
              popupDiv.appendChild(riskP);
              
              circle.bindPopup(popupDiv);

              if (onZoneClick) {
                circle.on('click', () => {
                  try {
                    onZoneClick(zone);
                  } catch (error) {
                    console.error('Error handling zone click:', error);
                  }
                });
              }
            } catch (error) {
              console.error('Error adding zone to map:', error);
            }
          });
        } else {
          console.log('No zones to display on map');
        }

        // Get user location with better error handling
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              try {
                const { latitude, longitude } = position.coords;
                L.marker([latitude, longitude])
                  .addTo(map)
                  .bindPopup('Your Location')
                  .openPopup();
                map.setView([latitude, longitude], 15);
              } catch (error) {
                console.error('Error setting user location:', error);
              }
            },
            (error) => {
              console.log('Location access denied or unavailable:', error.message);
            }
          );
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError(error instanceof Error ? error.message : 'Failed to initialize map');
        setMapLoaded(false);
      }
    };

    // Start initialization
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [zones, onLocationSelect, onZoneClick, onMapClick]);

  return (
    <div>
      {/* Map Legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm">Safe Zone</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-sm">Caution (4-5 reports)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
          <span className="text-sm">Warning (6-15 reports)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm">Danger (15+ reports)</span>
        </div>
      </div>

      {/* Map Status */}
      {zonesLoading && (
        <div className="mb-2 text-sm text-blue-600">Loading safety zones...</div>
      )}
      {mapError && (
        <div className="mb-2 text-sm text-red-600">Map Error: {mapError}</div>
      )}
      {mapLoaded && zones.length > 0 && (
        <div className="mb-2 text-sm text-green-600">Map loaded with {zones.length} safety zones</div>
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className={`${height} rounded-lg border border-gray-200 bg-gray-100`}
        data-testid="map-container"
        style={{ minHeight: '300px' }}
      />

      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
