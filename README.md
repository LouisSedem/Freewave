# FreeWave - Music Streaming App

A Spotify/YouTube Music inspired free music streaming web app built with Next.js 16, TypeScript, Tailwind CSS, and the Apple Music/iTunes Search API.

## Features

- 🎵 **Music Search** - Search for any song, artist, or album via iTunes/Apple Music API
- 🎧 **Audio Playback** - Full player with play/pause, skip, shuffle, repeat, volume control
- 📂 **Browse Genres** - 14 genres: Hip Hop, Jazz, Electronic, Soul, Classical, R&B, Reggae, Rock, Blues, Folk, Funk, Country, Ambient, Indie
- ❤️ **Favorites** - Save your favorite tracks (persisted to SQLite database)
- 📋 **Playlists** - Create and manage custom playlists
- 🌙 **Dark Theme** - Spotify-inspired dark UI with glass effects
- 📱 **Responsive** - Mobile-first design with bottom nav, desktop sidebar layout
- 🎨 **Smooth UX** - Animated hover effects, loading states, genre cards with gradients

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + custom dark theme
- **State**: Zustand
- **Database**: Prisma ORM + SQLite
- **Music API**: iTunes Search API (free, no key required)

## Getting Started

```bash
# Install dependencies
bun install

# Push database schema
bun run db:push

# Start dev server
bun run dev
```

## API Routes

- `GET /api/search?q=query&limit=12` - Search for songs
- `GET /api/playlists` - List all playlists
- `POST /api/playlists` - Create a playlist
- `DELETE /api/playlists` - Delete a playlist
- `GET /api/favorites` - Get all favorites
- `POST /api/favorites` - Add a favorite
- `DELETE /api/favorites` - Remove a favorite

## Architecture

```
src/
├── app/
│   ├── api/           # API routes (search, playlists, favorites)
│   ├── globals.css    # Dark theme with custom properties
│   ├── layout.tsx     # Root layout with ViewProvider
│   └── page.tsx       # Main SPA page (Home/Search/Library views)
├── components/
│   ├── layout/        # AppLayout, Sidebar, MobileNav
│   └── player/        # PlayerBar with full controls
├── lib/
│   ├── api.ts         # iTunes/YouTube search utilities
│   ├── db.ts          # Prisma database client
│   └── genres.ts      # Genre definitions and featured searches
└── store/
    ├── player-store.ts # Zustand player state
    └── view-context.tsx # Navigation view context
```

## Deployment

Deploy to Vercel, Netlify, or any Node.js host. No environment variables needed for the music search (iTunes API is free). For database persistence, set:

```
DATABASE_URL="file:./dev.db"
```

## License

Personal project - not for distribution.
