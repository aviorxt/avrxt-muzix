import type { Metadata } from 'next';
import MuzixChartClient from './MuzixChartClient';

export const metadata: Metadata = { title: 'Muzix Chart — AVRXT Spotify listening dashboard', description: 'Explore AVRXT’s current Spotify track, public playlists, top artists, top songs, recent rotation, and monthly music capsule.', alternates: { canonical: '/' } };
export default function Page() { return <MuzixChartClient />; }
