/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const DEFAULT_LOCATION = {
  lat: 21.1592,
  lng: 79.0806,
  name: "Riaan Tower, Rangilal Marg, Near Mangalwari Bazaar, Sadar 440001",
};

const MapModal = ({ onClose, onSelectLocation }) => {
  const [mapLoading, setMapLoading] = useState(true);
  const [detectLoading, setDetectLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION.name);
  const mapRef = useRef(null);

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            format: "json",
            lat,
            lon: lng,
          },
        }
      );
      return response.data.display_name || "Unknown location";
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "Unknown location";
    }
  };

  const MapClickHandler = () => {
    const map = useMap();
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setSelectedPosition({ lat, lng });
        const name = await reverseGeocode(lat, lng);
        setLocationName(name);
        onSelectLocation(name, { lat, lng });
        map.flyTo([lat, lng], 15);
      },
    });
    return null;
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser");
      return;
    }

    setDetectLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const name = await reverseGeocode(latitude, longitude);
        setSelectedPosition({ lat: latitude, lng: longitude });
        setLocationName(name);
        onSelectLocation(name, { lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 15);
        }

        setDetectLoading(false);
      },
      () => {
        toast.error("Unable to access your location");
        setDetectLoading(false);
      }
    );
  };

  useEffect(() => {
    // Auto-detect location on map load
    if (!navigator.geolocation) {
      setSelectedPosition(DEFAULT_LOCATION);
      setLocationName(DEFAULT_LOCATION.name);
      onSelectLocation(DEFAULT_LOCATION.name, DEFAULT_LOCATION);
      setMapLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
  async (position) => {
    const { latitude, longitude } = position.coords;
    const name = await reverseGeocode(latitude, longitude);
    setSelectedPosition({ lat: latitude, lng: longitude });
    setLocationName(name);
    onSelectLocation(name, { lat: latitude, lng: longitude });
    if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 15);
    setDetectLoading(false);
  },
  () => {
    toast.error("Unable to access your location");
    setDetectLoading(false);
  },
  { enableHighAccuracy: true }
);
  }, []);

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelectLocation(locationName, selectedPosition);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-4/5 h-4/5 shadow-lg flex flex-col relative">
        <h2 className="sm:text-xl text-base text-neutral-700 font-bold mb-4 text-center">
          Select or Detect Location
        </h2>

        <div className="relative flex-1">
          {(mapLoading || detectLoading) && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white bg-opacity-70">
              <div className="loader border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
            </div>
          )}

          <MapContainer
            center={[selectedPosition.lat, selectedPosition.lng]}
            zoom={15}
            style={{ height: "100%", borderRadius: "8px" }}
            whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler />
            <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
              <Popup>
                <p className="text-sm">{locationName}</p>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Detect My Location Button outside map */}
          <button
            onClick={handleDetectLocation}
            className="absolute top-4 right-4 z-[1100] bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            {detectLoading ? "Locating..." : "Detect My Location"}
          </button>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={mapLoading || detectLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={mapLoading || detectLoading || !selectedPosition}
          >
            Confirm Location
          </button>
        </div>

        {selectedPosition && (
          <p className="my-2 text-neutral-800 sm:text-base text-sm text-center">
            <b>Selected:</b> {locationName}
          </p>
        )}

        <style >{`
          .loader {
            border-width: 4px;
            border-style: solid;
            border-color: blue transparent transparent transparent;
          }
        `}</style>
      </div>
    </div>
  );
};

export default MapModal;
