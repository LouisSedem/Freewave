"use client";

import React, { useState, useCallback } from "react";
import { Home, Search, Library, Settings, Plus, Heart, Music2 } from "lucide-react";
import { useView } from "@/store/view-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NAV_ITEMS = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Your Library", icon: Library },
];

export function Sidebar() {
  const { view, setView } = useView();
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePlaylist = useCallback(async () => {
    if (!playlistName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playlistName.trim() }),
      });
      if (res.ok) {
        setPlaylistName("");
        setCreateOpen(false);
      }
    } catch {
      // Silently fail
    } finally {
      setIsCreating(false);
    }
  }, [playlistName]);

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
          <button
            onClick={() => setCreateOpen(true)}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            aria-label="Create playlist"
          >
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

      {/* Create Playlist Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#282828] border-[#3e3e3e] text-white">
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription className="text-[#b3b3b3]">
              Give your new playlist a name.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="My awesome playlist"
            className="bg-[#3e3e3e] border-[#535353] text-white placeholder:text-[#727272]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreatePlaylist();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-[#b3b3b3] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!playlistName.trim() || isCreating}
              className="bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
