/**
 * Componente: DeliveryMap
 */

'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DriverIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/763/763865.png', // Delivery truck/bike icon
  iconSize: [35, 35],
  iconAnchor: [17, 17],
});

function RecenterMap({ location }: { location: { lat: number, lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([location.lat, location.lng], 15);
  }, [location, map]);
  return null;
}

export default function DeliveryMap({ orderId }: { orderId: string }) {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    const connect = async () => {
      try {
        // 1. Try to get initial location via HTTP
        const res = await fetch(`/api/delivery/${orderId}/location`);
        const data = await res.json();
        if (data.lat && data.lng) {
          setLocation({ lat: data.lat, lng: data.lng });
        }

        // 2. Connect to WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/delivery/${orderId}/ws`;
        
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'location_update' && payload.lat && payload.lng) {
              setLocation({ lat: payload.lat, lng: payload.lng });
            }
          } catch (e) {
            console.error('Error parsing location update:', e);
          }
        };

        ws.onerror = () => {
          setError('Erro ao conectar com o entregador.');
        };

      } catch (err) {
        setError('Não foi possível carregar a localização.');
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, [orderId]);

  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!location) return <div className="p-4 text-center animate-pulse">Aguardando sinal do entregador...</div>;

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
      <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[location.lat, location.lng]} icon={DriverIcon}>
          <Popup>Zé Paulo está aqui!</Popup>
        </Marker>
        <RecenterMap location={location} />
      </MapContainer>
    </div>
  );
}
