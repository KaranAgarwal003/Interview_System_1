import { useState, useRef, useCallback, useEffect } from "react";

const FaceCapture = ({ onCapture, onError, mode = "enroll", compact = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      const msg = "Camera access denied. Please allow camera permission.";
      setError(msg);
      if (onError) onError(msg);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);

    // Small delay for scanning animation
    setTimeout(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      setCaptured(base64);
      setScanning(false);

      if (onCapture) onCapture(base64);
    }, 800);
  }, [onCapture]);

  const retake = useCallback(() => {
    setCaptured(null);
    if (onCapture) onCapture(null);
    startCamera();
  }, [onCapture, startCamera]);

  const containerSize = compact ? "w-56 h-44" : "w-80 h-60";
  const circleSize = compact ? "w-32 h-32" : "w-48 h-48";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Camera View */}
      <div className={`relative ${containerSize} rounded-2xl overflow-hidden bg-gray-900 shadow-xl`}>
        {/* Live Video */}
        {!captured && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        )}

        {/* Captured Photo */}
        {captured && (
          <img
            src={captured}
            alt="Captured face"
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        )}

        {/* Face Guide Overlay */}
        {!captured && isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`${circleSize} rounded-full border-2 border-dashed border-cyan-400 opacity-60`} />
          </div>
        )}

        {/* Scanning Animation */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="absolute inset-x-0 h-0.5 bg-cyan-400 animate-scan-line" />
            <div className={`${circleSize} rounded-full border-2 border-cyan-400 animate-pulse`} />
          </div>
        )}

        {/* Success Overlay */}
        {captured && !scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <div className="bg-green-500 rounded-full p-2 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-80">
            <div className="text-center p-3">
              <svg className="w-8 h-8 text-red-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l-4 4m0-4l4 4m6-4a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Text */}
      <p className="text-xs text-gray-500 text-center">
        {error
          ? "Camera unavailable"
          : scanning
          ? "🔍 Scanning face..."
          : captured
          ? "✅ Face captured successfully"
          : mode === "enroll"
          ? "Position your face within the circle"
          : "Look at the camera for verification"
        }
      </p>

      {/* Controls */}
      <div className="flex gap-2">
        {!captured && !error && (
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!isStreaming || scanning}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Face
              </>
            )}
          </button>
        )}

        {captured && (
          <button
            type="button"
            onClick={retake}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retake
          </button>
        )}

        {error && (
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-all duration-200"
          >
            Retry Camera
          </button>
        )}
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning keyframes */}
      <style>{`
        @keyframes scanLine {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        .animate-scan-line {
          animation: scanLine 1.2s ease-in-out infinite;
          position: absolute;
          box-shadow: 0 0 12px 4px rgba(0,255,255,0.5);
        }
      `}</style>
    </div>
  );
};

export default FaceCapture;
