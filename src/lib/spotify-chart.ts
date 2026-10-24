export type ChartTrack = { id: string; title: string; artist: string; album: string; image: string; url: string; durationMs: number };
export type ChartArtist = { id: string; name: string; image: string; url: string; genres: string[] };
export type MuzixChart = {
  connected: boolean; generatedAt: number; permissionsRequired: boolean;
  nowPlaying: (ChartTrack & { isPlaying: boolean; progressMs: number; repeatState: string; shuffle: boolean; contextUrl: string; contextName: string }) | null;
  topArtists: ChartArtist[]; topTracks: ChartTrack[]; recentTracks: Array<ChartTrack & { playedAt: string }>;
  onLoop: (ChartTrack & { recentPlays: number }) | null; likedSongs: number | null;
  playlists: Array<{ id: string; name: string; image: string; url: string; tracks: number }>;
  capsule: { label: string; topArtist: string | null; topTrack: string | null; leadingGenre: string | null; uniqueRecentArtists: number };
};
