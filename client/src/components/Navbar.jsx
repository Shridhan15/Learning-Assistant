import React from "react";
import { UserButton } from "@clerk/clerk-react"; // Or from react-router-dom if not using Clerk's special links
import { Link, useLocation, NavLink } from "react-router-dom";
import { Home, BrainCircuit, Bot, LogOut } from "lucide-react";
import { UserButton as ClerkUserButton } from "@clerk/clerk-react";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
    { name: "Quiz", path: "/quiz", icon: <BrainCircuit className="w-4 h-4" /> },
 
    {
      name: "AI Tutor",
      path: "/tutor",
      icon: <Bot className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-white"
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span>QuizMaster</span>
          </Link>
 
          <div className="hidden md:flex items-center space-x-1 bg-white/5 rounded-full p-1 border border-white/5">
            {navItems.map((item) =>
              item.disabled ? (
                <div
                  key={item.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-600 cursor-not-allowed"
                >
                  {item.icon}
                  {item.name}
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded ml-1">
                    Soon
                  </span>
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              )
            )}
          </div>
 
          <div className="flex items-center gap-4">
            <ClerkUserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border-2 border-indigo-500/30",
                },
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
