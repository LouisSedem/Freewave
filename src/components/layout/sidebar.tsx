"use client";

import React from "react";
import { Home, Search, Library, Settings, Plus, Heart, Music2 } from "lucide-react";
import { useView } from "@/store/view-context";

const NAV_ITEMS = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Your Library", icon: Library },
];

export function Sidebar() {
  const { view, setView } = useView();

  return (
    <aside className="hidden md:flex w-[280px] flex-shrink-0 bg-black flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex-shrink-0 py-5 px-4 pb-2">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
            <Music2 size={18} className="text-black" />
          </div>
          <span className="font-black text-lg tracking-widest text-white uppercase">
            FreeWave
          </span>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 w-full mb-0.5 ${
                isActive
                  ? "text-white bg-white/10"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <Icon
                size={24}
                className={isActive ? "text-white" : "text-[#b3b3b3]"}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Playlists section */}
      <div className="flex-1 overflow-y-auto fw-scrollbar px-4 pt-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[11px] text-[#b3b3b3] uppercase tracking-[0.16em] font-semibold">
            Playlists
          </p>
          <button className="text-[#b3b3b3] hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={() => setView("library")}
          className="w-full text-left text-sm py-1.5 px-2 rounded-md truncate transition-colors flex items-center gap-2.5 text-[#b3b3b3] hover:text-white hover:bg-white/5"
        >
          <Heart size={14} className="text-[#1db954]" />
          Liked Songs
        </button>
      </div>

      {/* Settings */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg text-sm font-semibold text-[#b3b3b3] hover:text-white transition-colors hover:bg-white/5">
          <Settings size={20} />
          Settings
        </button>
      </div>
    </aside>
  );
}
