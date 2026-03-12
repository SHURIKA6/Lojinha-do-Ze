'use client';

import { useEffect, useState, useRef } from 'react';
import { FiMapPin, FiNavigation } from 'react-icons/fi';

export default function AddressPicker({ address, onAddressChange, coordinates, onCoordinatesChange }) {
  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Use browser geolocation
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onCoordinatesChange({ lat, lng });
          // Reverse geocode
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`);
            const data = await res.json();
            if (data.display_name) onAddressChange(data.display_name);
          } catch {}
          setShowMap(true);
        },
        () => alert('Não foi possível obter sua localização. Verifique as permissões do navegador.'),
        { enableHighAccuracy: true }
      );
    }
  };

  // Load Leaflet map dynamically (client-only)
  useEffect(() => {
    if (!showMap || mapReady) return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const container = mapRef.current;
      if (!container || mapInstanceRef.current) return;

      const defaultLat = coordinates?.lat || -11.86;
      const defaultLng = coordinates?.lng || -55.50;

      const map = L.map(container).setView([defaultLat, defaultLng], 15);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        onCoordinatesChange({ lat: pos.lat, lng: pos.lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&accept-language=pt-BR`);
          const data = await res.json();
          if (data.display_name) onAddressChange(data.display_name);
        } catch {}
      });

      map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        onCoordinatesChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json&accept-language=pt-BR`);
          const data = await res.json();
          if (data.display_name) onAddressChange(data.display_name);
        } catch {}
      });

      setMapReady(true);

      // Force resize after render
      setTimeout(() => map.invalidateSize(), 200);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [showMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && coordinates?.lat) {
      mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 15);
      markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    }
  }, [coordinates]);

  return (
    <div>
      <div className="form-group">
        <label className="form-label"><FiMapPin style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Endereço de Entrega *</label>
        <input
          className="form-input"
          value={address}
          onChange={e => onAddressChange(e.target.value)}
          placeholder="Rua, número, bairro, cidade..."
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', marginTop: '-0.5rem' }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleUseMyLocation}>
          <FiNavigation /> Usar minha localização
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowMap(!showMap)}>
          <FiMapPin /> {showMap ? 'Ocultar mapa' : 'Selecionar no mapa'}
        </button>
      </div>

      {showMap && (
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--gray-200)', marginBottom: 'var(--space-4)' }}>
          <div ref={mapRef} style={{ height: 250, width: '100%' }} />
          <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--gray-50)', fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>
            📍 Clique no mapa ou arraste o marcador para ajustar o endereço
          </div>
        </div>
      )}
    </div>
  );
}
