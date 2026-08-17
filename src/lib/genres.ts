// Genre definitions with curated search terms and colors
export interface Genre {
  id: string;
  name: string;
  searchTerms: string[];
  color: string;          // gradient from-color
  colorTo: string;        // gradient to-color
  imageQuery: string;     // unsplash query for fallback images
}

export const GENRES: Genre[] = [
  {
    id: "hip-hop",
    name: "Hip Hop",
    searchTerms: ["hip hop 2024", "rap hits", "drake", "kendrick lamar"],
    color: "#f59e0b",
    colorTo: "#d97706",
    imageQuery: "hip hop music concert",
  },
  {
    id: "jazz",
    name: "Jazz",
    searchTerms: ["jazz classics", "smooth jazz", "miles davis", "john coltrane"],
    color: "#8b5cf6",
    colorTo: "#6d28d9",
    imageQuery: "jazz saxophone",
  },
  {
    id: "electronic",
    name: "Electronic",
    searchTerms: ["electronic dance music", "edm", "techno", "house music"],
    color: "#06b6d4",
    colorTo: "#0891b2",
    imageQuery: "electronic music festival",
  },
  {
    id: "soul",
    name: "Soul",
    searchTerms: ["soul music", "r&b soul", "neo soul", "frank ocean"],
    color: "#ec4899",
    colorTo: "#db2777",
    imageQuery: "soul music vinyl",
  },
  {
    id: "classical",
    name: "Classical",
    searchTerms: ["classical music", "piano sonata", "beethoven", "chopin"],
    color: "#f97316",
    colorTo: "#ea580c",
    imageQuery: "classical orchestra",
  },
  {
    id: "rnb",
    name: "R&B",
    searchTerms: ["r&b", "rnb 2024", "the weeknd", "sza"],
    color: "#a855f7",
    colorTo: "#9333ea",
    imageQuery: "rnb music studio",
  },
  {
    id: "reggae",
    name: "Reggae",
    searchTerms: ["reggae music", "bob marley", "dancehall", "dub"],
    color: "#22c55e",
    colorTo: "#16a34a",
    imageQuery: "reggae music beach",
  },
  {
    id: "rock",
    name: "Rock",
    searchTerms: ["rock music", "alternative rock", "indie rock", "classic rock"],
    color: "#ef4444",
    colorTo: "#dc2626",
    imageQuery: "rock guitar concert",
  },
  {
    id: "blues",
    name: "Blues",
    searchTerms: ["blues guitar", "delta blues", "chicago blues", "b.b. king"],
    color: "#3b82f6",
    colorTo: "#2563eb",
    imageQuery: "blues guitar player",
  },
  {
    id: "folk",
    name: "Folk",
    searchTerms: ["folk music", "indie folk", "acoustic", "fleet foxes"],
    color: "#84cc16",
    colorTo: "#65a30d",
    imageQuery: "folk music acoustic guitar",
  },
  {
    id: "funk",
    name: "Funk",
    searchTerms: ["funk music", "james brown", "parliament funkadelic", "disco funk"],
    color: "#eab308",
    colorTo: "#ca8a04",
    imageQuery: "funk music dance",
  },
  {
    id: "country",
    name: "Country",
    searchTerms: ["country music", "modern country", "country hits", "luke combs"],
    color: "#d97706",
    colorTo: "#b45309",
    imageQuery: "country music nashville",
  },
  {
    id: "ambient",
    name: "Ambient",
    searchTerms: ["ambient music", "chill electronic", "ambient chill", "brian eno"],
    color: "#14b8a6",
    colorTo: "#0d9488",
    imageQuery: "ambient nature calm",
  },
  {
    id: "indie",
    name: "Indie",
    searchTerms: ["indie music", "indie rock", "indie pop", "arctic monkeys"],
    color: "#f472b6",
    colorTo: "#ec4899",
    imageQuery: "indie music festival",
  },
];

// Featured searches for the "Featured Today" section
export const FEATURED_SEARCHES = [
  { title: "Top Hits 2024", query: "top hits 2024" },
  { title: "Chill Vibes", query: "chill vibes playlist" },
  { title: "Workout Energy", query: "workout music energy" },
  { title: "Late Night Jazz", query: "late night jazz smooth" },
  { title: "Throwback Classics", query: "90s 2000s throwback hits" },
  { title: "New Releases", query: "new music releases 2024" },
];
