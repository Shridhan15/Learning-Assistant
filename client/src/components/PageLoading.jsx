import React from "react";
import { Loader2 } from "lucide-react";
import { images } from "../assets/assets";
 
const PageLoading = () => {
  return (
    <div className="fixed inset-0 w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* --- Background Ambient Glow (Pulsing) --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      {/* --- Main Loader UI --- */}
      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Spinner Wrapper */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Outer Ring 1*/}
          <div className="absolute inset-0 w-full h-full border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />

          {/* Inner Ring 2   */}
          <div className="absolute inset-3 w-[75%] h-[75%] border-4 border-purple-500/10 border-b-purple-500/50 rounded-full animate-spin [animation-duration:1.5s]" />

          {/* Logo Image */}
          <div className="relative z-10 w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-indigo-500/20 bg-slate-900 flex items-center justify-center">
            <img
              src={images.logo}  
              alt="Loading Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 tracking-wide">
            AI StudyMate
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Syncing library...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoading;
