import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {url:'https://muzix.avrxt.dev/',lastModified:new Date(),changeFrequency:'daily',priority:0.8},
    {url:'https://muzix.avrxt.dev/privacy',lastModified:new Date('2026-11-05'),changeFrequency:'monthly',priority:0.3},
    {url:'https://muzix.avrxt.dev/terms',lastModified:new Date('2026-11-05'),changeFrequency:'monthly',priority:0.3},
  ];
}
