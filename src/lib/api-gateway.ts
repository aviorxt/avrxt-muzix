const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://api.avrxt.dev').replace(/\/$/, '');
export function apiUrl(path: string) { return `${API_ORIGIN}${path}`; }
