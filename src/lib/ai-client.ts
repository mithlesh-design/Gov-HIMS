// Client/server bridge to the OpenAI JSON proxy (/api/ai/complete). AI services
// call `aiJSON` with a task prompt; it returns the model's structured result, or
// null when the AI is unavailable so the caller can fall back to reference data.

export async function aiJSON<T>(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<T | null> {
  try {
    const res = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user, ...opts }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data && typeof data === 'object' && !('error' in data)) ? data as T : null
  } catch {
    return null
  }
}
