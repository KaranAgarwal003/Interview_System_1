import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const MobileConnectModal = ({ isOpen, onClose, sessionId }) => {
  const [localIp, setLocalIp] = useState("YOUR_IP_ADDRESS");
  const [showQr, setShowQr] = useState(false);

  // In a real app, you'd fetch this from the backend or the user would know it
  const mobileLink = `https://${localIp}:5173/mobile-shield?session=${sessionId}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Mobile Shield</h2>
          <p className="text-gray-600 text-sm mb-6">
            Scan this QR code with your phone and place it to your side for 360° protection.
          </p>
        </div>

        {!showQr ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
                Local IP Address (Check using 'ipconfig')
              </label>
              <input 
                type="text" 
                value={localIp}
                onChange={(e) => setLocalIp(e.target.value)}
                placeholder="e.g., 192.168.1.5"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => setShowQr(true)}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
              Generate QR Code
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-white p-4 rounded-2xl border-4 border-blue-50 inline-block mb-4 shadow-inner">
              <QRCodeSVG value={mobileLink} size={200} />
            </div>
            <p className="text-xs text-gray-400 break-all mb-4">
              {mobileLink}
            </p>
            <button 
              onClick={() => setShowQr(false)}
              className="text-blue-600 font-semibold text-sm hover:underline"
            >
              ← Edit IP Address
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-500 italic">Waiting for mobile connection...</span>
        </div>
      </div>
    </div>
  );
};

export default MobileConnectModal;
