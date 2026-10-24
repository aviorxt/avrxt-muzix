import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://muzix.avrxt.dev/sitemap.xml', host: 'https://muzix.avrxt.dev' }; }
