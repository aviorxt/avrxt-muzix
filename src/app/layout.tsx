import type { Metadata, Viewport } from 'next';
import { Inter, Space_Mono, Outfit } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
import './globals.css';

const favicon = '/brand/avrxt-selected/favicon.ico';
export const metadata: Metadata = {
  metadataBase: new URL('https://muzix.avrxt.dev'), applicationName: 'AVRXT Muzix',
  title: { default: 'Muzix Chart — AVRXT', template: '%s | AVRXT Muzix' },
  description: 'AVRXT’s public Last.fm listening chart: now playing, recent scrobbles, artists, tracks and albums.',
  keywords: ['avrxt', 'muzix', 'last.fm', 'listening journal', 'now playing', 'music dashboard'], authors: [{ name: 'avrxt', url: 'https://www.avrxt.dev/about' }], creator: 'avrxt', publisher: 'avrxt', alternates: { canonical: '/' }, manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  icons: { icon: [{ url: favicon, type: 'image/x-icon', sizes: '16x16 32x32 48x48 64x64 128x128 256x256' }, { url: '/brand/avrxt-selected/icon-32.png', type: 'image/png', sizes: '32x32' }, { url: '/brand/avrxt-selected/icon-192.png', type: 'image/png', sizes: '192x192' }, { url: '/brand/avrxt-selected/icon-512.png', type: 'image/png', sizes: '512x512' }], shortcut: [favicon], apple: [{ url: '/brand/avrxt-selected/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
  openGraph: { type: 'website', url: '/', siteName: 'AVRXT Muzix', title: 'Muzix Chart — AVRXT', description: 'The current AVRXT listening signal: now playing, recent scrobbles and listening charts.' },
  twitter: { card: 'summary', title: 'Muzix Chart — AVRXT', description: 'AVRXT Last.fm listening telemetry.' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#050505', colorScheme: 'dark' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className="dark"><body className={`${inter.variable} ${mono.variable} ${outfit.variable} antialiased`}>{children}</body></html>; }
