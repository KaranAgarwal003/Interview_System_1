import React, { useEffect, useState } from "react";
import Camera from "../component/Camera";
import QuestionGenerator from "../component/QuestionGenerator";
import MobileConnectModal from "../component/MobileConnectModal";
import SecondEye from "../component/SecondEye";
import { useAuth } from "../context/AuthContext";

const InterviewSystem = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [sessionId] = useState(`sess_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans antialiased">
      {/* Sleek Minimal Header */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
               </svg>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight uppercase">Intervue<span className="text-blue-600">AI</span></h1>
          </div>

          <div className="flex items-center space-x-6">
             <div className="text-right border-r border-gray-100 pr-6">
                <p className="text-[10px] font-black text-gray-400 uppercase">Current Time</p>
                <p className="text-xs font-bold text-gray-900">{currentTime.toLocaleTimeString()}</p>
             </div>
             <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{user?.name || "Candidate"}</p>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">ID Verified</p>
                </div>
                <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-black">
                   {user?.name?.charAt(0) || "U"}
                </div>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Assessment Area (Left) */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-10 min-h-[600px]">
               <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">Technical Assessment</h2>
                  <button 
                    onClick={() => setIsMobileModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-black rounded-xl border border-gray-200 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Link Secondary Feed
                  </button>
               </div>
               <QuestionGenerator />
            </div>
          </div>

          {/* Monitoring Sidebar (Right) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Camera Feed Stack */}
            <div className="space-y-4">
              <Camera />
              <SecondEye sessionId={sessionId} />
            </div>

            {/* Performance Snapshot */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Integrity Status</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-600">Visual Gaze</span>
                    <span className="text-[9px] font-black text-green-600 px-2 py-0.5 bg-white rounded-full">Focused</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-600">Second-Eye</span>
                    <span className="text-[9px] font-black text-blue-600 px-2 py-0.5 bg-white rounded-full">Secure</span>
                  </div>
               </div>
            </div>

            {/* AI Proctor Log */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
               <div className="absolute -right-4 -bottom-4 opacity-5">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" /></svg>
               </div>
               <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">System Logic</h3>
               <div className="space-y-3 relative z-10">
                  <div className="flex flex-col border-l-2 border-blue-500/30 pl-3">
                     <span className="text-[10px] font-black text-blue-400">YOLOv8_Engine</span>
                     <span className="text-[9px] text-gray-500 font-bold">Scanning Environment...</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-indigo-500/30 pl-3">
                     <span className="text-[10px] font-black text-indigo-400">Semantic_Analyzer</span>
                     <span className="text-[9px] text-gray-500 font-bold">Checking Speech Flow...</span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      <MobileConnectModal 
        isOpen={isMobileModalOpen} 
        onClose={() => setIsMobileModalOpen(false)} 
        sessionId={sessionId}
      />
    </div>
  );
};

export default InterviewSystem;
