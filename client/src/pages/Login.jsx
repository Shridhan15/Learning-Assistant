import React from "react";
import { SignIn } from "@clerk/clerk-react";

const Login = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-950 overflow-hidden">
   
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
 
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px]" />
 
      <div className="relative z-10 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl w-full max-w-md">
        <h1 className="text-white text-3xl font-extrabold text-center mb-2">
          Quiz Master
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Sign in or create an account to continue 
        </p>

        <SignIn
          path="/login"
          routing="path"
          forceRedirectUrl="/"
          appearance={{
            elements: {
              card: "bg-transparent shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;
