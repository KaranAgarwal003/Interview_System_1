import React, { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "../config/api.js";

const SecondEye = ({ sessionId }) => {
  const [frameData, setFrameData] = useState(null);
  const [error, setError] = useState("Waiting...");

  useEffect(() => {
    const fetchFrame = async () => {
      if (!sessionId) return;
      try {
        const response = await axios.get(getApiUrl(`/get_mobile_frame/${sessionId}`, true));
        setFrameData(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Offline");
        setFrameData(null);
      }
    };
    const interval = setInterval(fetchFrame, 1500);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shield Stream</span>
        {frameData && (
          <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-blue-600">SYNCED</span>
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-black rounded-b-2xl overflow-hidden min-h-[120px] flex items-center justify-center">
        {frameData ? (
          <img src={`data:image/jpeg;base64,${frameData.image}`} className="w-full h-full object-cover" alt="shield" />
        ) : (
          <div className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">{error}</div>
        )}

        {frameData && (frameData.phone_detected || frameData.face_count > 1) && (
          <div className="absolute top-2 left-2 right-2 bg-red-600/90 text-white text-[9px] font-black p-2 rounded-lg backdrop-blur-sm border border-red-500 animate-pulse">
            ⚠️ integrity violation
          </div>
        )}

        <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
           CAM_02
        </div>
      </div>
    </div>
  );
};

export default SecondEye;
