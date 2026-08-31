"use client";

import React from "react";
import { motion } from "motion/react";
import { Home, Mic, Layers, Compass, User } from "lucide-react";

export type NavTab = "home" | "live" | "history" | "knowledge" | "settings";

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isLiveActive: boolean;
}

export function Navigation({ activeTab, onTabChange, isLiveActive }: NavigationProps) {
  const tabs = [
    { id: "home" as NavTab, label: "Home", icon: Home },
    { id: "live" as NavTab, label: "Live", icon: Mic, badge: isLiveActive },
    { id: "history" as NavTab, label: "Projects", icon: Layers },
    { id: "knowledge" as NavTab, label: "Discover", icon: Compass },
    { id: "settings" as NavTab, label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-3xl border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] pt-2 w-full h-[84px] flex items-center">
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-50 rounded-t-3xl -z-10" />
              )}
              <div className={`relative p-2 mb-1 transition-all duration-500`}>
                <Icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? "scale-110 text-white" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[11px] font-medium tracking-wide transition-all duration-300 ${isActive ? "opacity-100" : "opacity-80"}`}>
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div 
                  layoutId="nav-pill"
                  className="absolute bottom-0 w-12 h-1 bg-primary rounded-t-full shadow-[0_0_10px_#00e5ff]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
