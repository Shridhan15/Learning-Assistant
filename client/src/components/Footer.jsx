import React from "react";
import { Github, Linkedin, Twitter, Heart, Code2, Globe } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-slate-950 border-t border-white/10 relative overflow-hidden py-8">
      {/* --- Top Glow Effect (Subtle) --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-10 bg-indigo-500/10 blur-[40px] -z-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Credits */}
        <div className="text-center md:text-left">
          <p className="text-slate-300 font-medium text-sm flex items-center gap-2 justify-center md:justify-start">
            Made with{" "}
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />{" "}
            by
            <span className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors cursor-pointer">
              Shridhan
            </span>
          </p>
          <p className="text-slate-500 text-xs mt-1">
            © {new Date().getFullYear()} AI Quiz Master Project.
          </p>
        </div>

        {/* Center/Right: Tech Stack Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
          <Code2 className="w-3 h-3" />
          <span>Built with React & Python</span>
        </div>

        {/* Right Side: Social Links */}
        <div className="flex items-center gap-4">
          <SocialLink
            href="https://github.com/Shridhan15"
            icon={<Github className="w-4 h-4" />}
            label="GitHub"
          />
          <SocialLink
            href="https://www.linkedin.com/in/shridhan-suman-3970a3293/"
            icon={<Linkedin className="w-4 h-4" />}
            label="LinkedIn"
          />
          <SocialLink
            href="https://portfolio-chi-ecru-34.vercel.app/"
            icon={<Globe className="w-4 h-4" />}
            label="Portfolio"
          />
        </div>
      </div>
    </footer>
  );
};

// Simple Icon Link Component
const SocialLink = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="p-2 rounded-lg bg-white/5 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 border border-transparent hover:border-indigo-500/30 transition-all duration-300"
  >
    {icon}
  </a>
);

export default Footer;
