/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
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

// 🧭 Fix default marker icon (needed for Leaflet + React)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// 🎯 Default allowed location
const DEFAULT_LOCATION = {
  lat: 21.1592,
  lng: 79.0806,
  name: "Riaan Tower, Rangilal Marg, Near Mangalwari Bazaar, Sadar 440001",
};

const MapModal = ({ onClose, onSelectLocation }) => {
  const [detectLoading, setDetectLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION.name);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // 🗺 Reverse geocoding with User-Agent header (prevents rate-limit)
  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: { format: "json", lat, lon },
          headers: {
            "User-Agent": "SmartickApp/1.0 (contact@smartick.com)",
          },
        }
      );
      return response.data.display_name || "Unknown location";
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "Unknown location";
    }
  };

  // 📍 Handle map click (manual selection)
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
        if (markerRef.current) markerRef.current.openPopup();
      },
    });
    return null;
  };

  // 📡 Detect user's current location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setDetectLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        console.log("Detected position:", latitude, longitude, "±", accuracy, "m");

        const name = await reverseGeocode(latitude, longitude);
        const newPosition = { lat: latitude, lng: longitude };

        setSelectedPosition(newPosition);
        setLocationName(name);
        onSelectLocation(name, newPosition);

        // Move map to user's location smoothly
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 15, {
            animate: true,
            duration: 1.5,
          });
          setTimeout(() => {
            mapRef.current.setView([latitude, longitude], 15);
          }, 1600);
        }

        // Open popup after animation
        setTimeout(() => {
          if (markerRef.current) markerRef.current.openPopup();
        }, 1700);

        setDetectLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setDetectLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied by user.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Please try again.");
            break;
          default:
            toast.error("Unable to detect your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // ⏱ Increased from 10s → 20s for reliability
        maximumAge: 0,
      }
    );
  };

  // ✅ Confirm button handler
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

        {/* Map Section */}
        <div className="relative flex-1">
          {detectLoading && (
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
            <Marker
              position={[selectedPosition.lat, selectedPosition.lng]}
              ref={markerRef}
            >
              <Popup>
                <p className="text-sm">{locationName}</p>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Detect My Location button */}
          <button
            onClick={handleDetectLocation}
            className="absolute top-4 right-4 z-[1100] bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            disabled={detectLoading}
          >
            {detectLoading ? "Locating..." : "Detect My Location"}
          </button>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={detectLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={detectLoading || !selectedPosition}
          >
            Confirm Location
          </button>
        </div>

        {/* Selected location text */}
        {selectedPosition && (
          <p className="my-2 text-neutral-800 sm:text-base text-sm text-center">
            <b>Selected:</b> {locationName}
          </p>
        )}

        {/* Loader CSS */}
        <style>{`
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