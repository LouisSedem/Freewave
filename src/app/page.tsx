"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Play,
  Pause,
  Heart,
  Plus,
  Music2,
  Loader2,
  X,
  ChevronRight,
} from "lucide-react";
import { usePlayerStore, type Track } from "@/store/player-store";
import { useView } from "@/store/view-context";
import { GENRES, FEATURED_SEARCHES } from "@/lib/genres";
import { searchAll } from "@/lib/api";

// ─── Genre Card ───────────────────────────────────────────────
function GenreCard({ genre, onPlay }: { genre: (typeof GENRES)[0]; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="snap-start flex-shrink-0 w-40 md:w-48 h-36 md:h-44 rounded-xl relative overflow-hidden cursor-pointer group"
    >
      <div
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${genre.color}, ${genre.colorTo})`,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-3 pt-6 pb-2.5">
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
    <button onClick={onPlay} className="snap-start flex-shrink-0 w-36 md:w-44 group">
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 relative">
        {tracks.length > 0 && tracks[0].artwork ? (
          <img src={tracks[0].artwork} alt={item.title} className="w-full h-full object-cover" />
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

// ─── Track Row ────────────────────────────────────────────────
function TrackRow({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
}: {
  track: Track;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = async () => {
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
    <button
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 rounded-md transition-colors group ${
        isCurrentTrack ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {/* Number / Play icon */}
      <div className="w-6 flex items-center justify-center flex-shrink-0">
        {isHovered ? (
          <Play size={14} className="text-white" fill="white" />
        ) : isCurrentTrack && isPlaying ? (
          <div className="flex gap-0.5 items-end h-3">
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "60%", animation: "pulse 0.6s infinite alternate" }} />
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "100%", animation: "pulse 0.6s infinite alternate 0.2s" }} />
            <span className="w-0.5 bg-[#1db954] rounded-full" style={{ height: "40%", animation: "pulse 0.6s infinite alternate 0.4s" }} />
          </div>
        ) : (
          <span className={`text-sm ${isCurrentTrack ? "text-[#1db954]" : "text-[#b3b3b3]"}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Artwork */}
      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#282828]">
        {track.artwork ? (
          <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
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

      {/* Source badge */}
      <span className="hidden md:inline text-[10px] text-[#727272] bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
        {track.source === "itunes" ? "Apple Music" : "YouTube"}
      </span>

      {/* Duration */}
      <span className="text-xs text-[#b3b3b3] ml-2 flex-shrink-0">
        {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}` : "—"}
      </span>

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
        className="ml-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
      >
        <Heart
          size={14}
          className={isFavorite ? "text-[#1db954] fill-[#1db954]" : "text-[#b3b3b3] hover:text-white"}
        />
      </button>
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
    <div className="pt-2 pb-4">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-10 glass-dark flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
          <Music2 size={16} className="text-black" />
        </div>
        <span className="font-black text-sm tracking-widest text-white uppercase">FreeWave</span>
        <div className="ml-auto flex items-center gap-2">
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

      {/* Browse Genres */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-4 md:px-8">
          <h2 className="text-lg font-extrabold text-white tracking-tight">Browse Genres</h2>
          <button className="text-[11px] font-bold text-[#b3b3b3] hover:text-white uppercase tracking-widest transition-colors">
            See all
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-1">
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

      {/* Quick play genre tracks */}
      {Object.entries(featuredTracks).some(([, tracks]) => tracks.length > 0) && (
        <section className="px-4 md:px-8">
          <h2 className="text-lg font-extrabold text-white tracking-tight mb-3">Jump Back In</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {FEATURED_SEARCHES.slice(0, 6).map((item) => {
              const tracks = featuredTracks[item.query] || [];
              if (tracks.length === 0) return null;
              return (
                <button
                  key={item.query}
                  onClick={() => playTrack(tracks[0], tracks)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-md overflow-hidden transition-colors group"
                >
                  <div className="w-12 h-12 flex-shrink-0">
                    {tracks[0].artwork ? (
                      <img src={tracks[0].artwork} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <Music2 size={16} className="text-[#727272]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left py-1 pr-2">
                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                    <p className="text-xs text-[#b3b3b3]">{tracks.length} tracks</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center mr-2 opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                    <Play size={14} className="text-black ml-0.5" fill="black" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
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
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
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
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3]" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
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
              className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              <Play size={18} className="text-black ml-0.5" fill="black" />
            </button>
            <h2 className="text-xl font-bold text-white">Songs</h2>
            <span className="text-sm text-[#b3b3b3]">{results.length} results</span>
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
                className="h-20 rounded-xl relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${genre.color}, ${genre.colorTo})` }}
              >
                <span className="absolute bottom-2 left-3 text-sm font-bold text-white">{genre.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIBRARY VIEW ─────────────────────────────────────────────
function LibraryView() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [favorites, setFavorites] = useState<Array<{ trackId: string; title: string; artist: string; artwork: string | null; source: string; videoId: string | null; duration: number | null }>>([]);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; trackCount: number }>>([]);
  const [activeTab, setActiveTab] = useState<"playlists" | "favorites">("playlists");

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => setFavorites(data.favorites || []))
      .catch(() => {});
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((data) =>
        setPlaylists(
          (data.playlists || []).map((p: { id: string; name: string; _count: { tracks: number } }) => ({
            id: p.id,
            name: p.name,
            trackCount: p._count.tracks,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const favTracks: Track[] = favorites.map((f) => ({
    id: f.trackId,
    title: f.title,
    artist: f.artist,
    artwork: f.artwork,
    source: f.source as "youtube" | "itunes",
    videoId: f.videoId,
    duration: f.duration,
  }));

  return (
    <div className="pb-4">
      <div className="md:hidden sticky top-0 z-10 glass-dark flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center">
          <Music2 size={16} className="text-black" />
        </div>
        <span className="font-black text-sm tracking-widest text-white uppercase">Your Library</span>
      </div>

      <div className="hidden md:block px-8 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white mb-5 tracking-tight">Your Library</h1>
      </div>

      <div className="px-4 md:px-8 mb-4">
        <div className="flex gap-2">
          {(["playlists", "favorites"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15"
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
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors group">
              <div className="w-12 h-12 rounded-md bg-[#282828] group-hover:bg-[#3a3a3a] flex items-center justify-center transition-colors">
                <Plus size={20} className="text-[#b3b3b3]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Create New Playlist</p>
                <p className="text-xs text-[#b3b3b3]">Build your perfect collection</p>
              </div>
            </button>
            <div className="mt-2 space-y-0.5">
              {playlists.length === 0 && (
                <p className="text-center text-[#535353] text-sm py-12">No playlists yet. Create one to get started!</p>
              )}
              {playlists.map((playlist) => (
                <div key={playlist.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#8b5cf6] to-[#4c1d95] flex items-center justify-center flex-shrink-0">
                    <Music2 size={18} className="text-white/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
                    <p className="text-xs text-[#b3b3b3]">{playlist.trackCount} {playlist.trackCount === 1 ? "song" : "songs"}</p>
                  </div>
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
                <p className="text-[#b3b3b3] text-sm mt-1">Save songs by tapping the heart icon</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => { if (favTracks.length > 0) playTrack(favTracks[0], favTracks); }}
                    className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                  >
                    <Play size={18} className="text-black ml-0.5" fill="black" />
                  </button>
                  <h2 className="text-xl font-bold text-white">Liked Songs</h2>
                  <span className="text-sm text-[#b3b3b3]">{favorites.length} songs</span>
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
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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
