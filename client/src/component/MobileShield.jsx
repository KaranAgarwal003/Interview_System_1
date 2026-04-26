import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { getApiUrl } from "../config/api.js";

const MobileShield = () => {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState("Initializing...");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);

  const sessionId = new URLSearchParams(window.location.search).get("session");

  const sendFrame = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const blob = await fetch(imageSrc).then((res) => res.blob());
      const formData = new FormData();
      formData.append("image", blob, "mobile_frame.jpg");
      formData.append("is_mobile", "true");
      formData.append("session_id", sessionId);

      try {
        const response = await axios.post(
          getApiUrl("/detect_phone", true),
          formData
        );
        if (response.data.phone_detected) {
          setStatus("⚠️ PHONE DETECTED BY SHIELD!");
        } else {
          setStatus("✅ Shield Active: Monitoring Room");
        }
      } catch (err) {
        console.error("Shield sync error:", err);
        setStatus("❌ Connection Error");
      }
    }
  };

  useEffect(() => {
    let interval;
    if (isCapturing) {
      interval = setInterval(sendFrame, 2000);
    }
    return () => clearInterval(interval);
  }, [isCapturing]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-3xl overflow-hidden shadow-2xl border border-gray-700">
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            IntervueAI Shield
          </h1>
          <p className="text-gray-400 text-sm mb-4">
            Position this phone to your side to monitor your desk area.
          </p>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            onUserMedia={() => {
              setIsCapturing(true);
              setStatus("✅ Camera Connected");
            }}
            onUserMediaError={(err) => {
              setError("Camera access denied. Please allow camera access.");
              setStatus("❌ Error");
            }}
            videoConstraints={{ facingMode: "environment" }}
          />
          {!isCapturing && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className={`text-center py-3 rounded-xl font-semibold mb-4 ${
            status.includes("⚠️") ? "bg-red-500/20 text-red-400" : 
            status.includes("✅") ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-300"
          }`}>
            {status}
          </div>

          {error && (
            <div className="text-red-400 text-center mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="bg-gray-700/50 p-3 rounded-lg text-center">
              <p className="font-bold text-gray-400">Session ID</p>
              <p className="truncate">{sessionId || "Direct Access"}</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg text-center">
              <p className="font-bold text-gray-400">Mode</p>
              <p>Proctor Shield</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-gray-600 text-xs uppercase tracking-widest">
        Property of IntervueAI System
      </div>
    </div>
  );
};

export default MobileShield;
