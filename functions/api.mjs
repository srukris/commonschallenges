import { getStore } from "@netlify/blobs";
import { loadSubmissions } from "../lib/analyse.mjs";

export const config = { path: "/api/*" };

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const isAdmin = (req) => {
  const p = process.env.ADMIN_PASSWORD;
  return !!p && req.headers.get("x-admin-key") === p;
};
const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "x";
const scKey = (sk, sn) => (sk === "gpdp" ? "gpdp" : "c-" + slug(sn));

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const meta = getStore("meta"), subs = getStore("scenarios");
  try {
    if (route === "submit" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const g = clip(b.g, 80), isG = b.sk === "gpdp", sn = isG ? "GPDP scenario" : clip(b.sn, 120);
      if (!g || !sn || !Array.isArray(b.steps)) return json({ error: "Group name, scenario and steps are required" }, 400);
      const sk = scKey(isG ? "gpdp" : "c", sn);
      const steps = b.steps.slice(0, 80).map((s) => ({
        gp: s.gp ? clip(s.gp, 10) : undefined,
        ph: [0, 1, 2].includes(Number(s.ph)) ? Number(s.ph) : 0,
        q: clip(s.q, 2000), d: clip(s.d, 2000), c: clip(s.c, 2000), h: clip(s.h, 3000), t: !!s.t,
      }));
      await subs.setJSON(slug(g) + "__" + sk, { g, sk, sn, desc: clip(b.desc, 600), steps, ts: Date.now() });
      return json({ ok: true, ts: Date.now() });
    }

    if (route === "mine" && req.method === "GET") {
      const g = clip(url.searchParams.get("g"), 80), sn = clip(url.searchParams.get("sn"), 120);
      const isG = url.searchParams.get("sk") === "gpdp";
      if (!g) return json({ submission: null });
      const d = await subs.get(slug(g) + "__" + scKey(isG ? "gpdp" : "c", sn), { type: "json" });
      return json({ submission: d || null });
    }

    if (route.startsWith("admin/")) {
      if (!isAdmin(req)) return json({ error: "Unauthorised" }, 401);

      if (route === "admin/submissions" && req.method === "GET") return json({ submissions: await loadSubmissions() });

      if (route === "admin/analysis" && req.method === "GET") {
        const [analysis, job] = await Promise.all([meta.get("analysis", { type: "json" }), meta.get("job", { type: "json" })]);
        return json({ analysis: analysis || null, job: job || null });
      }

      if (route === "admin/analyse" && req.method === "POST") {
        const job = await meta.get("job", { type: "json" });
        if (job?.state === "running" && Date.now() - job.ts < 12 * 60 * 1000) return json({ error: "Already running" }, 409);
        await meta.setJSON("job", { state: "running", ts: Date.now() });
        const r = await fetch(new URL("/.netlify/functions/analyse-background", req.url), {
          method: "POST",
          headers: { "x-admin-key": req.headers.get("x-admin-key") },
        });
        if (r.status !== 202) {
          await meta.setJSON("job", { state: "error", error: "Could not start analysis (" + r.status + ")", ts: Date.now() });
          return json({ error: "Could not start analysis" }, 500);
        }
        return json({ ok: true }, 202);
      }

      if (route === "admin/clear" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        if (b.confirm !== "CLEAR") return json({ error: "Confirmation missing" }, 400);
        const { blobs } = await subs.list();
        await Promise.all(blobs.map((x) => subs.delete(x.key)));
        await meta.delete("analysis"); await meta.delete("job");
        return json({ ok: true });
      }
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
};
