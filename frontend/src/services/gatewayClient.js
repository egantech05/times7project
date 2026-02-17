function mustGetGatewayUrl() {
    const url = process.env.EXPO_PUBLIC_GATEWAY_URL;
    if (!url) throw new Error("Missing EXPO_PUBLIC_GATEWAY_URL in .env.local");
    return url.replace(/\/$/, "");
  }
  
  async function mustOk(res) {
    if (res.ok) return res;
    let body = "";
    try {
      body = await res.text();
    } catch {}
    throw new Error(`Gateway error: ${res.status}${body ? ` - ${body}` : ""}`);
  }
  
  export async function fetchActiveTags() {
    const base = mustGetGatewayUrl();
    const res = await mustOk(await fetch(`${base}/api/active-tags`));
    return await res.json();
  }
  
  export async function sendTagIds(tagIds) {
    const base = mustGetGatewayUrl();
    const res = await mustOk(
      await fetch(`${base}/api/reader/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      })
    );
    return await res.json();
  }

  export async function fetchReaderStatus() {
    const base = mustGetGatewayUrl();
    const res = await mustOk(await fetch(`${base}/api/reader-status`));
    return await res.json();
  }