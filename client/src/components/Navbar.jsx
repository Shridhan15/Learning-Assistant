import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BrainCircuit, Bot, Menu, X, Camera } from "lucide-react";
import { UserButton as ClerkUserButton } from "@clerk/clerk-react";
import { images } from "../assets/assets";

const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
    { name: "Quiz", path: "/quiz", icon: <BrainCircuit className="w-4 h-4" /> },
    { name: "AI Tutor", path: "/tutor", icon: <Bot className="w-4 h-4" /> },
    { name: "Studio", path: "/studio", icon: <Camera className="w-4 h-4" /> },
  ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* --- LOGO --- */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-white shrink-0"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/20">
              <img
                src={images.logo}
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="font-semibold text-white tracking-tight hidden sm:block">
              StudyMate
            </span>
          </Link>

          {/* ---  (Hidden on Mobile) --- */}
          <div className="hidden md:flex items-center space-x-1 bg-white/5 rounded-full p-1 border border-white/5">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  location.pathname === item.path
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>

          {/* --- RIGHT SIDE  --- */}
          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center">
              <ClerkUserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "w-9 h-9 border-2 border-indigo-500/30 hover:border-indigo-400 transition-colors",
                  },
                }}
              />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="cursor-pointer md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU DROPDOWN --- */}
      <div
        className={`md:hidden absolute left-0 right-0 bg-[#0a0a0b] border-b border-white/10 transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen
            ? "max-h-64 opacity-100 py-4"
            : "max-h-0 opacity-0 py-0"
        }`}
      >
        <div className="px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {React.cloneElement(item.icon, { className: "w-5 h-5" })}
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
