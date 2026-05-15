export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin")
  // Allow non-browser clients that do not send Origin.
  if (!origin) return true

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") ?? "http"
  if (!host) return false

  try {
    const originUrl = new URL(origin)
    return originUrl.host === host && originUrl.protocol === `${proto}:`
  } catch {
    return false
  }
}
