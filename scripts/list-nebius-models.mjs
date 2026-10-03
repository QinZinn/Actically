// Read-only account catalog verification; no generation or model substitution.
const endpoint = "https://api.tokenfactory.nebius.com/v1/";
const key = process.env.NEBIUS_API_KEY;
if (!key) { console.error("AI_NOT_CONFIGURED: set NEBIUS_API_KEY in .env.local (never in Board)."); process.exitCode = 1; }
else if (process.env.NEBIUS_BASE_URL && process.env.NEBIUS_BASE_URL !== endpoint) { console.error("AI_MODEL_UNAVAILABLE: only the official Nebius Token Factory endpoint is allowed."); process.exitCode = 1; }
else {
  try {
    const response = await fetch(`${endpoint}models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store" });
    if (!response.ok) throw new Error("catalog unavailable");
    const json = await response.json();
    const ids = (json.data ?? []).map(m => m.id).filter(id => typeof id === "string" && /^nvidia\/[^\s]*nemotron[^\s]*$/i.test(id));
    console.log(JSON.stringify({ endpoint, nemotronModels: ids, configuredModelAccessible: !!process.env.NEBIUS_MODEL && ids.includes(process.env.NEBIUS_MODEL), inferenceVerified: false, capabilitiesVerified: false }, null, 2));
    if (!ids.length) process.exitCode = 1;
  } catch { console.error("AI_MODEL_UNAVAILABLE: could not verify the authenticated Nebius catalog. Check configuration and network."); process.exitCode = 1; }
}
