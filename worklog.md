# FreeWave Worklog

---
Task ID: 3
Agent: Main Agent
Task: Fix 30-second playback - client-side CORS proxy approach

Work Log:
- Tested all 5 Invidious instances - all dead/timing out
- Tested 4 Piped API instances - all down
- Tested allorigins, corsproxy.io, cors.sh, proxyfx - all fail from production
- corsproxy.io returns 403 on vercel.app domains ("Free usage is limited to localhost")
- Tested YouTube innertube API - works locally but blocked on Vercel IPs
- Tested ytInitialData HTML parsing - works locally but Vercel IPs get empty results
- Discovered corsproxy.io DOES work from browser (returns YouTube HTML with 257 videoIds)
- Moved YouTube search to client-side via CORS proxy
- Implemented ytInitialData parsing in browser (proven to extract videoIds + metadata)
- corsproxy.io blocks production - need self-hosted proxy
- Created Cloudflare Worker (worker/youtube-proxy-worker.js) as the solution
- Cloudflare Workers run on edge, not blocked by YouTube, free 100K requests/day
- App reads NEXT_PUBLIC_YT_PROXY_URL env var to find the proxy

Stage Summary:
- Root cause: YouTube blocks ALL datacenter IPs (Vercel, AWS, GCP) + all public CORS proxies block production domains
- Solution: Self-hosted Cloudflare Worker as CORS proxy (2 min setup, free, permanent)
- Code is ready, just needs NEXT_PUBLIC_YT_PROXY_URL env var on Vercel
---
Task ID: 1
Agent: main
Task: Fix full-track YouTube playback on mobile

Work Log:
- Discovered Vercel production branch was master not main (pushes went to preview only)
- Pushed to master, verified proxy URL in deployed chunks
- Tested search via browser agent: proxy-worker.telesmartgh.workers.dev returns 200, search results show Full Track
- Found critical bug: PlayerBar (containing ALL YouTube player logic) wrapped in hidden md:block — never rendered on mobile
- Created PlaybackEngine component that is ALWAYS mounted (handles YouTube IFrame API + iTunes Audio)
- Stripped PlayerBar down to UI-only (no playback logic)
- Updated MobileNav to use seekTo for progress bar
- Added seekPosition/clearSeek/seekTo to player store
- Verified #yt-player div exists on both desktop and mobile viewports

Stage Summary:
- Proxy Worker: working (200, returns ytInitialData)
- Search: working (Full Track results with videoIds)
- PlaybackEngine: deployed, always-mounted, #yt-player div exists on all viewports
- Cannot test actual YouTube iframe in headless browser (known limitation)

