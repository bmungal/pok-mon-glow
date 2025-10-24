// lib/ha.js
// Minimal HA client for app (REST API)
// work in progress with a mock call turned into a real one later

// export async function callService(domain, service, data, { url, token } = {}) {
//   const baseUrl = url || globalThis.__HA_URL__;
//   const bearer = token || globalThis.__HA_TOKEN__;

//   if (!baseUrl || !bearer) {
//     throw new Error(
//       "Missing HA URL or token. Set them in Settings or via globals."
//     );
//   }

//   const res = await fetch(`${baseUrl}/api/services/${domain}/${service}`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${bearer}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   });

//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(`HA ${res.status}: ${text || res.statusText}`);
//   }
//   // some services return empty body
//   try {
//     return await res.json();
//   } catch {
//     return {};
//   }
// }

// lib/ha.js
// lib/ha.js
// lib/ha.js
export async function pingHA({ url, token } = {}) {
    const baseUrl = url || globalThis.__HA_URL__;
    const bearer  = token || globalThis.__HA_TOKEN__;
  
    console.log("[HA] ping: start", { baseUrlPresent: !!baseUrl, tokenPresent: !!bearer });
  
    const res = await fetch(`${baseUrl}/api/`, {
      headers: { Authorization: `Bearer ${bearer}` }
    });
  
    const text = await res.text();
    console.log("[HA] ping: response", res.status, text);
  
    return { ok: res.ok, status: res.status, body: text };
  }
  
  export async function callService(domain, service, data, { url, token } = {}) {
    const baseUrl = url || globalThis.__HA_URL__;
    const bearer  = token || globalThis.__HA_TOKEN__;
  
    if (!baseUrl || !bearer) {
      throw new Error("Missing HA URL or token. Set them in globals.");
    }
  
    const endpoint = `${baseUrl}/api/services/${domain}/${service}`;
    console.log("[HA] POST", endpoint, "data:", data);
  
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  
    const text = await res.text().catch(() => "");
    console.log("[HA] status:", res.status, text);
  
    if (!res.ok) throw new Error(`HA ${res.status}: ${text || res.statusText}`);
  
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
  