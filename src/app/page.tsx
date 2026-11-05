import type { Metadata } from 'next';
import MuzixChartClient from './MuzixChartClient';

export const metadata: Metadata = { title: 'Muzix Chart — AVRXT Last.fm listening dashboard', description: 'Explore AVRXT’s current track, top artists, top songs, recent scrobbles, and monthly listening capsule.', alternates: { canonical: '/' } };
export default function Page() { return <MuzixChartClient />; }
