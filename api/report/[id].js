export const config = { runtime: 'edge' };

export default async function handler(req){
  const id = new URL(req.url).pathname.split('/').pop();
  if (!id) return new Response('Bad request', { status:400 });

  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/reports?id=eq.${id}&select=*`, {
    headers:{ apikey:process.env.SUPABASE_ANON_KEY, Authorization:`Bearer ${process.env.SUPABASE_ANON_KEY}` }
  });
  if (!r.ok) return new Response('Not found', { status:404 });
  const rows = await r.json(); if (!rows.length) return new Response('Not found', { status:404 });
  return new Response(render(rows[0]), { status:200, headers:{ 'Content-Type':'text/html; charset=utf-8' }});
}
const esc = s => String(s??'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
function render(rep){ const f=Array.isArray(rep.findings)?rep.findings:[]; return `<!doctype html><html lang="nl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GuardianLay — Rapport</title>
<style>body{font-family:system-ui;background:#fafafa;margin:0;color:#111}.w{max-width:900px;margin:0 auto;padding:24px}
.c{background:#fff;border:1px solid #eee;border-radius:12px;padding:18px;margin:12px 0}
.p{height:12px;background:#eee;border-radius:999px;overflow:hidden}.p>span{display:block;height:100%;background:linear-gradient(90deg,#2dd,#26a);width:${rep.score}%}
.find{border-left:6px solid #bbb;padding-left:12px;margin:12px 0}.find.High{border-color:#d33}.find.Medium{border-color:#e69f00}.find.Low{border-color:#aaa}
.small{color:#666;font-size:.9rem}</style></head><body><div class="w">
<div class="c"><h1>${esc(rep.site_url)}</h1><div class="p"><span></span></div>
<p><b>Score:</b> ${rep.score}/100 — <b>Risico:</b> ${esc(rep.risk_level)}</p><p class="small">Gegenereerd: ${new Date(rep.created_at).toLocaleString()}</p></div>
<div class="c"><h2>Belangrijkste bevindingen</h2>${
  f.map(x=>`<div class="find ${esc(x.severity||'')}"><h3>${esc(x.title||'Bevinding')}</h3>${
    x.evidence?`<p><b>Bewijs:</b> ${esc(x.evidence)}</p>`:''}${x.fix?`<p><b>Fix:</b> ${esc(x.fix)}</p>`:''}</div>`).join('')||'<p>Geen bevindingen.</p>'}
</div><div class="c"><h2>HTTP headers</h2><pre class="small">${esc(JSON.stringify(rep.headers||{},null,2))}</pre></div></div></body></html>`; }
