export async function computeAuthToken(password: string): Promise<string> {
  const data = new TextEncoder().encode('lead-scouter-v1:' + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
