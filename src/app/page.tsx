"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Play,
  Heart,
  Plus,
  Music2,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  ListPlus,
  Trash2,
} from "lucide-react";
import { usePlayerStore, type Track } from "@/store/player-store";
import { useView } from "@/store/view-context";
import { GENRES, FEATURED_SEARCHES } from "@/lib/genres";
import { searchAll } from "@/lib/api";

// ─── Add to Playlist Sheet ────────────────────────────────────
function AddToPlaylistSheet({
  track,
  open,
  onClose,
}: {
  track: Track | null;
  open: boolean;
  onClose: () => void;
}) {
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string; trackCount: number }>
  >([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/playlists")
        .then((r) => r.json())
        .then((data) =>
          setPlaylists(
            (data.playlists || []).map(
              (p: { id: string; name: string; _count: { tracks: number } }) => ({
                id: p.id,
                name: p.name,
                trackCount: p._count.tracks,
              })
            )
          )
        )
        .catch(() => {});
    }
  }, [open]);

  const addToPlaylist = async (playlistId: string) => {
    if (!track) return;
    setAddingTo(playlistId);
    try {
      await fetch("/api/playlists/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          source: track.source,
          videoId: track.videoId,
          duration: track.duration,
        }),
      });
    } catch {
      // silent
    } finally {
      setAddingTo(null);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-[#282828] rounded-t-2xl transition-transform duration-300 ease-out max-h-[60vh] flex flex-col ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-white">Add to Playlist</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto fw-scrollbar px-2 pb-8">
          {playlists.length === 0 ? (
            <p className="text-center text-[#535353] text-sm py-8">
              No playlists yet. Create one in Your Library.
            </p>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => addToPlaylist(p.id)}
                disabled={addingTo === p.id}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-md bg-gradient-to-br from-[#8b5cf6] to-[#4c1d95] flex items-center justify-center flex-shrink-0">
                  <Music2 size={16} className="text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-[#b3b3b3]">
                    {p.trackCount} {p.trackCount === 1 ? "song" : "songs"}
                  </p>
                </div>
                {addingTo === p.id ? (
                  <Loader2 size={16} className="text-[#1db954] animate-spin" />
                ) : (
                  <Plus size={18} className="text-[#b3b3b3]" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Track Row ────────────────────────────────────────────────
function TrackRow({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
  showAddToPlaylist,
  onAddToPlaylist,
  showRemove,
  onRemove,
}: {
  track: Track;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  showAddToPlaylist?: boolean;
  onAddToPlaylist?: (track: Track) => void;
  showRemove?: boolean;
  onRemove?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check initial favorite status
  useEffect(() => {
    fetch(`/api/favorites?trackId=${track.id}`)
      .then((r) => r.json())
      .then((data) => setIsFavorite(!!data.favorite))
      .catch(() => setIsFavorite(false));
  }, [track.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showMenu]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite) {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      });
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          source: track.source,
          videoId: track.videoId,
          duration: track.duration,
        }),
      });
    }
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => { setIsHovered(true); setShowMenu(false); }}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay(); }}
      className={`w-full flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-lg transition-colors group cursor-pointer ${
        isCurrentTrack ? "bg-white/10" : "hover:bg-white/5 active:bg-white/8"
      }`}
    >
      {/* Number / Play icon */}
      <div className="w-6 flex items-center justify-center flex-shrink-0">
        {isHovered || showMenu ? (
          <Play size={14} className="text-white" fill="white" />
        ) : isCurrentTrack && isPlaying ? (
          <div className="flex gap-0.5 items-end h-3">
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "60%", animation: "pulse 0.6s infinite alternate" }} />
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "100%", animation: "pulse 0.6s infinite alternate 0.2s" }} />
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "40%", animation: "pulse 0.6s infinite alternate 0.4s" }} />
          </div>
        ) : (
          <span className={`text-sm tabular-nums ${isCurrentTrack ? "text-[#1db954]" : "text-[#b3b3b3]"}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Artwork */}
      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#282828]">
        {track.artwork ? (
          <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={14} className="text-[#727272]" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? "text-[#1db954]" : "text-white"}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#b3b3b3] truncate">{track.artist}</p>
      </div>

      {/* Source badge (desktop) */}
      <span className="hidden md:inline-flex items-center text-[10px] font-medium text-[#727272] bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
        {track.source === "itunes" ? "30s Preview" : "Full Track"}
      </span>

      {/* Duration */}
      <span className="text-xs text-[#b3b3b3] tabular-nums flex-shrink-0">
        {track.duration
          ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}`
          : "—"}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 relative">
        {/* Favorite — always visible on mobile, hover on desktop */}
        <button
          onClick={toggleFavorite}
          className={`md:opacity-0 md:group-hover:opacity-100 p-1.5 transition-all active:scale-90 ${
            isFavorite ? "opacity-100" : ""
          }`}
        >
          <Heart
            size={16}
            className={`transition-colors ${
              isFavorite ? "text-[#1db954] fill-[#1db954]" : "text-[#b3b3b3] hover:text-white"
            }`}
          />
        </button>

        {/* Add to playlist / More menu */}
        {(showAddToPlaylist || showRemove) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (showRemove && onRemove) {
                onRemove();
              } else if (onAddToPlaylist) {
                onAddToPlaylist(track);
              }
            }}
            className={`md:opacity-0 md:group-hover:opacity-100 p-1.5 transition-all active:scale-90 ${
              showRemove ? "md:opacity-100" : ""
            }`}
          >
            {showRemove ? (
              <Trash2 size={14} className="text-[#b3b3b3] hover:text-[#e21c3e]" />
            ) : (
              <ListPlus size={16} className="text-[#b3b3b3] hover:text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Playlist Detail View ─────────────────────────────────────
function PlaylistDetailView({
  playlistId,
  onBack,
}: {
  playlistId: string;
  onBack: () => void;
}) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [playlist, setPlaylist] = useState<{
    id: string;
    name: string;
    tracks: Array<{
      id: string;
      trackId: string;
      title: string;
      artist: string;
      artwork: string | null;
      source: string;
      videoId: string | null;
      duration: number | null;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingTrack, setAddingTrack] = useState(false);

  const reloadPlaylist = useCallback(async () => {
    try {
      const [playlistRes, tracksRes] = await Promise.all([
        fetch("/api/playlists"),
        fetch(`/api/playlists/tracks?playlistId=${playlistId}`),
      ]);
      const playlistData = await playlistRes.json();
      const tracksData = await tracksRes.json();
      const found = (playlistData.playlists || []).find(
        (p: { id: string }) => p.id === playlistId
      );
      if (found) {
        setPlaylist({
          id: found.id,
          name: found.name,
          tracks: tracksData.tracks || [],
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    reloadPlaylist();
  }, [reloadPlaylist]);

  const playlistTracks: Track[] =
    playlist?.tracks.map((t) => ({
      id: t.trackId,
      title: t.title,
      artist: t.artist,
      artwork: t.artwork,
      source: t.source as "youtube" | "itunes",
      videoId: t.videoId,
      duration: t.duration,
    })) || [];

  const removeTrack = async (trackDbId: string) => {
    try {
      await fetch("/api/playlists/tracks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trackDbId }),
      });
      reloadPlaylist();
    } catch {
      // silent
    }
  };

  const deletePlaylist = async () => {
    if (!confirm(`Delete "${playlist?.name}"? This cannot be undone.`)) return;
    try {
      await fetch("/api/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playlistId }),
      });
      onBack();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="text-[#1db954] animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-24">
        <p className="text-[#535353] text-sm">Playlist not found</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="md:hidden sticky top-0 z-10 glass-dark flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-[#b3b3b3] hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{playlist.name}</p>
          <p className="text-xs text-[#b3b3b3]">
            {playlistTracks.length} {playlistTracks.length === 1 ? "song" : "songs"}
          </p>
        </div>
        <button
          onClick={deletePlaylist}
          className="p-1 text-[#b3b3b3] hover:text-[#e21c3e] transition-colors"
          aria-label="Delete playlist"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="hidden md:flex items-center justify-between px-8 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{playlist.name}</h1>
          <p className="text-sm text-[#b3b3b3] mt-1">
            {playlistTracks.length} {playlistTracks.length === 1 ? "song" : "songs"}
          </p>
        </div>
        <button
          onClick={deletePlaylist}
          className="text-sm text-[#b3b3b3] hover:text-[#e21c3e] transition-colors"
        >
          Delete Playlist
        </button>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8">
        {playlistTracks.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                if (playlistTracks.length > 0) playTrack(playlistTracks[0], playlistTracks);
              }}
              className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
            >
              <Play size={22} className="text-black ml-0.5" fill="black" />
            </button>
          </div>
        )}
        {playlistTracks.length === 0 ? (
          <div className="text-center py-16">
            <Music2 size={48} className="text-[#535353] mx-auto mb-4" />
            <p className="text-white font-bold text-lg">This playlist is empty</p>
            <p className="text-[#b3b3b3] text-sm mt-1">
              Find songs and add them to this playlist
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {playlistTracks.map((track, index) => {
              const dbTrack = playlist.tracks[index];
              return (
                <TrackRow
                  key={`${track.id}-${index}`}
                  track={track}
                  index={index}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onPlay={() => playTrack(track, playlistTracks)}
                  showRemove={!!dbTrack}
                  onRemove={() => dbTrack && removeTrack(dbTrack.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Genre Card ───────────────────────────────────────────────
function GenreCard({ genre, onPlay }: { genre: (typeof GENRES)[0]; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="snap-start flex-shrink-0 w-[144px] md:w-48 h-32 md:h-44 rounded-xl relative overflow-hidden cursor-pointer group active:scale-[0.97] transition-transform"
    >
      <div
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${genre.color}, ${genre.colorTo})`,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-3 pt-8 pb-2.5">
        <p className="text-xs font-bold text-white leading-tight drop-shadow-md">{genre.name}</p>
      </div>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 group-active:bg-black/25 transition-colors" />
      <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] shadow-xl flex items-center justify-center opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
        <Play size={18} className="text-black ml-0.5" fill="black" />
      </div>
    </button>
  );
}

// ─── Featured Card ────────────────────────────────────────────
function FeaturedCard({
  item,
  tracks,
  onPlay,
}: {
  item: (typeof FEATURED_SEARCHES)[0];
  tracks: Track[];
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      className="snap-start flex-shrink-0 w-[132px] md:w-44 group active:scale-[0.97] transition-transform"
    >
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 relative shadow-md">
        {tracks.length > 0 && tracks[0].artwork ? (
          <img src={tracks[0].artwork} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#8b5cf6] to-[#4c1d95] flex items-center justify-center">
            <Music2 size={40} className="text-white/50" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] shadow-xl flex items-center justify-center opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <Play size={18} className="text-black ml-0.5" fill="black" />
        </div>
      </div>
      <p className="text-sm font-semibold text-white">{item.title}</p>
      <p className="text-xs text-[#b3b3b3] mt-0.5">
        {tracks.length > 0 ? "Ready to play" : "Loading..."}
      </p>
    </button>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────
function HomeView() {
  const { setView } = useView();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [featuredTracks, setFeaturedTracks] = useState<Record<string, Track[]>>({});
  const [loadingGenre, setLoadingGenre] = useState<string | null>(null);

  useEffect(() => {
    FEATURED_SEARCHES.forEach(async (item) => {
      try {
        const tracks = await searchAll(item.query);
        setFeaturedTracks((prev) => ({ ...prev, [item.query]: tracks.slice(0, 6) }));
      } catch {}
    });
  }, []);

  const handleGenreClick = async (genre: (typeof GENRES)[0]) => {
    setLoadingGenre(genre.id);
    try {
      const allTracks: Track[] = [];
      for (const term of genre.searchTerms.slice(0, 2)) {
        const tracks = await searchAll(term);
        allTracks.push(...tracks);
      }
      const uniqueTracks = allTracks.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
      if (uniqueTracks.length > 0) {
        playTrack(uniqueTracks[0], uniqueTracks);
      }
    } catch (e) {
      console.error("Genre play failed:", e);
    } finally {
      setLoadingGenre(null);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="pb-4">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-10 glass-dark flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
          <Music2 size={16} className="text-black" />
        </div>
        <span className="font-black text-sm tracking-widest text-white uppercase">FreeWave</span>
        <div className="ml-auto">
          <button
            onClick={() => setView("search")}
            className="p-2 text-[#b3b3b3] hover:text-white transition-colors"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-4 md:px-8 mb-5">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{greeting()}</h1>
      </div>

      {/* Quick-play grid (mobile first, prominent) */}
      {Object.entries(featuredTracks).some(([, tracks]) => tracks.length > 0) && (
        <section className="px-4 md:px-8 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {FEATURED_SEARCHES.slice(0, 6).map((item) => {
              const tracks = featuredTracks[item.query] || [];
              if (tracks.length === 0) return null;
              return (
                <button
                  key={item.query}
                  onClick={() => playTrack(tracks[0], tracks)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-lg overflow-hidden transition-colors group"
                >
                  <div className="w-12 h-12 flex-shrink-0">
                    {tracks[0].artwork ? (
                      <img src={tracks[0].artwork} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <Music2 size={16} className="text-[#727272]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left py-1.5 pr-2">
                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                    <p className="text-xs text-[#b3b3b3]">{tracks.length} tracks</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center mr-2.5 opacity-0 group-hover:opacity-100 md:opacity-0 transition-all shadow-xl">
                    <Play size={14} className="text-black ml-0.5" fill="black" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Browse Genres */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-4 md:px-8">
          <h2 className="text-lg font-extrabold text-white tracking-tight">Browse Genres</h2>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-1">
          {GENRES.map((genre) => (
            <GenreCard key={genre.id} genre={genre} onPlay={() => handleGenreClick(genre)} />
          ))}
        </div>
      </section>

      {/* Featured Today */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-4 md:px-8">
          <h2 className="text-lg font-extrabold text-white tracking-tight">Featured Today</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-1">
          {FEATURED_SEARCHES.map((item) => (
            <FeaturedCard
              key={item.query}
              item={item}
              tracks={featuredTracks[item.query] || []}
              onPlay={() => {
                const tracks = featuredTracks[item.query];
                if (tracks && tracks.length > 0) playTrack(tracks[0], tracks);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── SEARCH VIEW ──────────────────────────────────────────────
function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const tracks = await searchAll(searchQuery);
      setResults(tracks);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) handleSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const playAll = () => {
    if (results.length > 0) playTrack(results[0], results);
  };

  return (
    <div className="pb-4">
      {/* Mobile search bar */}
      <div className="md:hidden sticky top-0 z-10 glass-dark px-4 py-3 border-b border-white/[0.06]">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#2a2a2a] rounded-full py-3 pl-10 pr-10 text-sm text-white placeholder-[#727272] focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop search */}
      <div className="hidden md:block px-8 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white mb-5 tracking-tight">Search</h1>
        <div className="relative max-w-[480px]">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/10 hover:bg-white/15 rounded-full py-3 pl-10 pr-10 text-sm text-white placeholder-[#b3b3b3] focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-white/20 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isSearching && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-[#1db954] animate-spin" />
        </div>
      )}

      {!isSearching && hasSearched && results.length > 0 && (
        <div className="px-4 md:px-8">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={playAll}
              className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
            >
              <Play size={22} className="text-black ml-0.5" fill="black" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Songs</h2>
              <span className="text-sm text-[#b3b3b3]">{results.length} results</span>
            </div>
          </div>
          <div className="space-y-0.5">
            {results.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                isCurrentTrack={currentTrack?.id === track.id}
                isPlaying={isPlaying && currentTrack?.id === track.id}
                onPlay={() => playTrack(track, results)}
                showAddToPlaylist
                onAddToPlaylist={setAddToPlaylistTrack}
              />
            ))}
          </div>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="text-center py-20">
          <Music2 size={48} className="text-[#727272] mx-auto mb-4" />
          <p className="text-white font-bold text-lg">No results found</p>
          <p className="text-[#b3b3b3] text-sm mt-1">Try searching for something else</p>
        </div>
      )}

      {!hasSearched && (
        <div className="md:hidden px-4">
          <h2 className="text-lg font-bold text-white mb-3">Browse All</h2>
          <div className="grid grid-cols-2 gap-3">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setQuery(genre.searchTerms[0])}
                className="h-20 rounded-xl relative overflow-hidden active:scale-[0.97] transition-transform"
                style={{ background: `linear-gradient(135deg, ${genre.color}, ${genre.colorTo})` }}
              >
                <span className="absolute bottom-2 left-3 text-sm font-bold text-white">{genre.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <AddToPlaylistSheet
        track={addToPlaylistTrack}
        open={!!addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
      />
    </div>
  );
}

// ─── LIBRARY VIEW ─────────────────────────────────────────────
function LibraryView() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [favorites, setFavorites] = useState<
    Array<{
      trackId: string;
      title: string;
      artist: string;
      artwork: string | null;
      source: string;
      videoId: string | null;
      duration: number | null;
    }>
  >([]);
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string; trackCount: number }>
  >([]);
  const [activeTab, setActiveTab] = useState<"playlists" | "favorites">("playlists");
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [favRes, plRes] = await Promise.all([
        fetch("/api/favorites"),
        fetch("/api/playlists"),
      ]);
      const favData = await favRes.json();
      const plData = await plRes.json();
      setFavorites(favData.favorites || []);
      setPlaylists(
        (plData.playlists || []).map(
          (p: { id: string; name: string; _count: { tracks: number } }) => ({
            id: p.id,
            name: p.name,
            trackCount: p._count.tracks,
          })
        )
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlaylist = async () => {
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
        loadData();
      }
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      await fetch("/api/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadData();
    } catch {
      // silent
    }
  };

  const favTracks: Track[] = favorites.map((f) => ({
    id: f.trackId,
    title: f.title,
    artist: f.artist,
    artwork: f.artwork,
    source: f.source as "youtube" | "itunes",
    videoId: f.videoId,
    duration: f.duration,
  }));

  // Playlist detail view
  if (selectedPlaylistId) {
    return (
      <PlaylistDetailView
        playlistId={selectedPlaylistId}
        onBack={() => setSelectedPlaylistId(null)}
      />
    );
  }

  return (
    <div className="pb-4">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-10 glass-dark flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
          <Music2 size={16} className="text-black" />
        </div>
        <span className="font-black text-sm tracking-widest text-white uppercase">Your Library</span>
      </div>

      <div className="hidden md:block px-8 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white mb-5 tracking-tight">Your Library</h1>
      </div>

      {/* Tab switcher */}
      <div className="px-4 md:px-8 mb-4">
        <div className="flex gap-2">
          {(["playlists", "favorites"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors active:scale-95 ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              {tab === "playlists" ? "Playlists" : "Liked Songs"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8">
        {activeTab === "playlists" && (
          <div>
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 active:bg-white/8 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-[#282828] group-hover:bg-[#3a3a3a] group-active:bg-[#3a3a3a] flex items-center justify-center transition-colors">
                <Plus size={22} className="text-[#b3b3b3]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Create New Playlist</p>
                <p className="text-xs text-[#b3b3b3]">Build your perfect collection</p>
              </div>
            </button>
            <div className="mt-2 space-y-0.5">
              {playlists.length === 0 && (
                <p className="text-center text-[#535353] text-sm py-12">
                  No playlists yet. Create one to get started!
                </p>
              )}
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 active:bg-white/8 transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#4c1d95] flex items-center justify-center flex-shrink-0">
                    <Music2 size={18} className="text-white/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3]">
                      {playlist.trackCount} {playlist.trackCount === 1 ? "song" : "songs"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(playlist.id);
                    }}
                    className="p-2 text-[#727272] hover:text-[#e21c3e] opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete playlist"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={16} className="text-[#727272]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "favorites" && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-16">
                <Heart size={48} className="text-[#727272] mx-auto mb-4" />
                <p className="text-white font-bold text-lg">Songs you like will appear here</p>
                <p className="text-[#b3b3b3] text-sm mt-1">
                  Save songs by tapping the heart icon
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => {
                      if (favTracks.length > 0) playTrack(favTracks[0], favTracks);
                    }}
                    className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                  >
                    <Play size={22} className="text-black ml-0.5" fill="black" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">Liked Songs</h2>
                    <span className="text-sm text-[#b3b3b3]">{favorites.length} songs</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {favTracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      isCurrentTrack={currentTrack?.id === track.id}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      onPlay={() => playTrack(track, favTracks)}
                      showAddToPlaylist
                      onAddToPlaylist={setAddToPlaylistTrack}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Playlist Dialog (mobile) */}
      {createOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setCreateOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-40 bg-[#282828] rounded-2xl p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-white mb-1">Create Playlist</h3>
            <p className="text-sm text-[#b3b3b3] mb-4">
              Give your new playlist a name.
            </p>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="My awesome playlist"
              className="w-full bg-[#3e3e3e] border border-[#535353] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#727272] focus:outline-none focus:ring-2 focus:ring-white/20 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePlaylist();
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-[#b3b3b3] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!playlistName.trim() || isCreating}
                className="flex-1 py-2.5 rounded-full text-sm font-bold bg-[#1db954] hover:bg-[#1ed760] text-black disabled:opacity-50 transition-colors"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </>
      )}

      <AddToPlaylistSheet
        track={addToPlaylistTrack}
        open={!!addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
      />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function HomePage() {
  const { view } = useView();

  if (view === "search") return <SearchView />;
  if (view === "library") return <LibraryView />;
  return <HomeView />;
}
