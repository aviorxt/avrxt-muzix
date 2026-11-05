export type MusicTrack = { id: string; title: string; artist: string; album: string; image: string; url: string; plays: number; playedAt: string | null };
export type MusicChart = {
  source: 'lastfm'; username: string; profileUrl: string; checkedAt: number; stale: boolean;
  nowPlaying: MusicTrack | null; recentTracks: MusicTrack[];
  chartPeriod: string; chartsUpdatedAt: number; chartsStale: boolean; totalScrobbles: number | null;
  topArtists: Array<{ name: string; url: string; image: string; plays: number }>;
  topTracks: MusicTrack[];
  topAlbums: Array<{ name: string; artist: string; url: string; image: string; plays: number }>;
  capsule: { label: string; timeZone: string; scrobbles: number; counted: number; complete: boolean; uniqueArtists: number; topArtist: string | null; onLoop: MusicTrack | null } | null;
};
