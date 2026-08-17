# FreeWave Worklog

---
Task ID: 2
Agent: Main Agent
Task: Fix 30-second playback - replace dead Invidious with ytInitialData parsing

Work Log:
- Tested all 5 Invidious instances (inv.tux.pizza, invidious.fdn.fr, vid.puffyan.us, invidious.nerdvpn.de, yt.artemislena.eu) - ALL dead/timing out
- Tested Piped API instances - all down or returning errors
- Tested CORS proxies (allorigins, corsproxy.io) - too slow or restricted
- Tested Google search for YouTube videoIds - blocked by bot detection
- Discovered YouTube HTML contains `ytInitialData` JSON with full metadata (videoId, title, artist, thumbnail, duration)
- Wrote parser that extracts structured video data from ytInitialData
- Tested locally: "drake plan" returns 4 full-length tracks (3-6 min) in 1.2s
- Previous JSONP approach required NEXT_PUBLIC_YOUTUBE_API_KEY which was never set on Vercel
- Pushed commit 11999c2

Stage Summary:
- Replaced dead Invidious + broken JSONP with ytInitialData HTML parsing
- No API key needed, no third-party dependencies
- Local test confirms full-track metadata extraction works
- Risk: Vercel IPs might get different YouTube HTML (untested)
