'use client';

import { useEffect, useRef, useState } from 'react';
import { FiMapPin, FiNavigation } from 'react-icons/fi';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './AddressPicker.module.css';

export default function AddressPicker({
  address,
  coordinates,
  onAddressChange,
  onCoordinatesChange,
}) {
  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const toast = useToast();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onCoordinatesChange({ lat, lng });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
          );
          const data = await response.json();
          if (data.display_name) {
            onAddressChange(data.display_name);
          }
        } catch (error) {
          console.error(error);
        }

        setShowMap(true);
      },
      () => {
        toast.error('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!showMap || mapReady) {
      return;
    }

    let mounted = true;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const container = mapRef.current;
      if (!container || mapInstanceRef.current || !mounted) {
        return;
      }

      const defaultLat = coordinates?.lat || -11.86;
      const defaultLng = coordinates?.lng || -55.5;

      const map = L.map(container).setView([defaultLat, defaultLng], 15);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        onCoordinatesChange({ lat: position.lat, lng: position.lng });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json&accept-language=pt-BR`
          );
          const data = await response.json();
          if (data.display_name) {
            onAddressChange(data.display_name);
          }
        } catch (error) {
          console.error(error);
        }
      });

      map.on('click', async (event) => {
        marker.setLatLng(event.latlng);
        onCoordinatesChange({ lat: event.latlng.lat, lng: event.latlng.lng });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${event.latlng.lat}&lon=${event.latlng.lng}&format=json&accept-language=pt-BR`
          );
          const data = await response.json();
          if (data.display_name) {
            onAddressChange(data.display_name);
          }
        } catch (error) {
          console.error(error);
        }
      });

      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    };

    loadMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [coordinates, mapReady, onAddressChange, onCoordinatesChange, showMap]);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && coordinates?.lat) {
      mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 15);
      markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    }
  }, [coordinates]);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">
          <FiMapPin style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
          Endereço de entrega *
        </label>
        <input
          className="form-input"
          id="checkout-address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Rua, número, bairro, cidade..."
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleUseMyLocation}>
          <FiNavigation />
          Usar minha localização
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowMap((value) => !value)}>
          <FiMapPin />
          {showMap ? 'Ocultar mapa' : 'Selecionar no mapa'}
        </button>
      </div>

      {showMap && (
        <div className={styles.map}>
          <div ref={mapRef} className={styles.canvas} />
          <div className={styles.hint}>
            Clique no mapa ou arraste o marcador para ajustar o endereço.
          </div>
        </div>
      )}
    </div>
  );
}
