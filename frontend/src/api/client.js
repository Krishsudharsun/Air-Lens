const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export async function fetchRoutes({ start, destination, departureTime }) {
  const res = await fetch(`${API_BASE_URL}/api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, destination, departureTime }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || body.detail || detail;
    } catch {
      // ignore parse failure, keep statusText
    }
    throw new Error(detail || 'Failed to fetch routes');
  }

  return res.json();
}
