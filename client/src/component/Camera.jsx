import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { getApiUrl } from "../config/api.js";

const Camera = () => {
  const webcamRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [faceCount, setFaceCount] = useState(1);
  const [phoneDetected, setPhoneDetected] = useState(false);

  const detectDetections = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    const blob = await fetch(imageSrc).then((res) => res.blob());
    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    try {
      const faceRes = await axios.post(getApiUrl("/detect_faces", true), formData);
      setFaceCount(faceRes.data.count);
      const phoneRes = await axios.post(getApiUrl("/detect_phone", true), formData);
      setPhoneDetected(phoneRes.data.phone_detected);
      setShowWarning(faceRes.data.count > 1 || phoneRes.data.phone_detected);
    } catch (error) {
      console.error("AI Analysis error:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(detectDetections, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Feed</span>
        <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-green-600">LIVE</span>
        </div>
      </div>
      
      <div className="relative aspect-video bg-black rounded-b-2xl overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          mirrored={true}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
          videoConstraints={{ facingMode: "user" }}
        />
        
        {showWarning && (
          <div className="absolute top-2 left-2 right-2 bg-red-600/90 text-white text-[9px] font-black p-2 rounded-lg backdrop-blur-sm border border-red-500 animate-pulse">
            ⚠️ {faceCount > 1 ? "MULTIPLE FACES" : "PHONE DETECTED"}
          </div>
        )}

        <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
           CAM_01
        </div>
      </div>
    </div>
  );
};

export default Camera;
