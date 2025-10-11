/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapModal = ({ onClose, onSelectLocation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [locationName, setLocationName] = useState("");

  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setSelectedPosition({ lat, lng });
        const name = await reverseGeocode(lat, lng);
        setLocationName(name);
        onSelectLocation(name, { lat, lng });
      },
    });
    return null;
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelectLocation(locationName, selectedPosition);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg w-4/5 h-4/5 shadow-lg">
        <h2 className="sm:text-xl text-base text-neutral-700 font-bold mb-4 text-center">
          Select Location
        </h2>

        <MapContainer
          center={[7.3056, 5.1357]}
          zoom={15}
          style={{ height: "70%", borderRadius: "8px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler />
          {selectedPosition && (
            <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
              <Popup>
                <p className="text-sm">{locationName}</p>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-200"
            disabled={loading || !selectedPosition}
          >
            {loading ? "Loading..." : "Confirm Location"}
          </button>
        </div>

        {selectedPosition && (
          <p className="my-2 text-neutral-800 sm:text-base text-sm">
            <b>Selected: </b>
            {locationName}
          </p>
        )}
      </div>
    </div>
  );
};

export default MapModal;
