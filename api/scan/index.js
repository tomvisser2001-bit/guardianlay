export const config = { runtime: 'edge' };
const has = (s, re) => re.test(s);
const getHeader = (h, name) => { for (const [k,v] of h.entries()) if (k===name.toLowerCase()) return v; return null; };
const riskOf = s => s>=85?'Low':s>=70?'Medium':'High';

export default async function handler(req){
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try{
    const { url, email } = await req.json();
    if (!url || !email) return json({ ok:false, error:'missing_params' }, 400);

    let u; try{ u = new URL(url); } catch { return json({ ok:false, error:'invalid_url' }, 400); }
    if (!/^https?:$/.test(u.protocol)) return json({ ok:false, error:'invalid_url' }, 400);

    const resp = await fetch(u.toString(), { headers:{ 'User-Agent':'GuardianLayScanner/1.0' }});
    const body = await resp.text();
    const hdr = {}; resp.headers.forEach((v,k)=>hdr[k]=v);

    let score = 100; const findings = [];
    if (u.protocol !== 'https:'){ findings.push({title:'Geen HTTPS',severity:'High',evidence:`${u.protocol}`,fix:'Gebruik HTTPS'}); score-=25; }
    const csp=getHeader(resp.headers,'content-security-policy'), hsts=getHeader(resp.headers,'strict-transport-security'),
          xfo=getHeader(resp.headers,'x-frame-options'), refpol=getHeader(resp.headers,'referrer-policy');
    if (!csp){ findings.push({title:'CSP ontbreekt',severity:'Medium',evidence:'header mist',fix:'Voeg CSP toe'}); score-=10; }
    if (!hsts){ findings.push({title:'HSTS ontbreekt',severity:'Low',evidence:'header mist',fix:'Zet HSTS aan'}); score-=5; }
    if (!xfo){ findings.push({title:'X-Frame-Options ontbreekt',severity:'Low',evidence:'header mist',fix:'Zet XFO of CSP frame-ancestors'}); score-=5; }
    if (!refpol){ findings.push({title:'Referrer-Policy ontbreekt',severity:'Low',evidence:'header mist',fix:'Zet strict-origin-when-cross-origin'}); score-=2; }
    if (resp.headers.get('set-cookie')){ findings.push({title:'Cookies bij eerste load',severity:'Medium',evidence:'Set-Cookie aanwezig',fix:'Plaats non-essential cookies pas na consent'}); score-=10; }
    const trackers=[];
    if (has(body,/\bgtag\(/i)) trackers.push('GA4');
    if (has(body,/googletagmanager\.com/i)) trackers.push('GTM');
    if (has(body,/facebook\.com\/tr\?/i)) trackers.push('Meta Pixel');
    if (has(body,/hotjar\.com|static\.hotjar\.com/i)) trackers.push('Hotjar');
    if (trackers.length){ findings.push({title:'Trackers gedetecteerd',severity:'Medium',evidence:trackers.join(', '),fix:'Blokkeer tot consent'}); score-=10; }
    const hasConsentUI = has(body,/cookie(consent|banner|settings)|iubenda|cookiebot|onetrust/i);
    if (!hasConsentUI && trackers.length){ findings.push({title:'Trackers zonder consent-UI',severity:'High',evidence:'geen consentmanager gevonden',fix:'Voeg cookiebanner/consentmanager toe'}); score-=20; }

    score = Math.max(0, Math.min(100, score));
    const risk = riskOf(score);

    const ins = await fetch(`${process.env.SUPABASE_URL}/rest/v1/reports`, {
      method:'POST',
      headers:{
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization:`Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type':'application/json',
        Prefer:'return=representation'
      },
      body: JSON.stringify([{ email, site_url:u.toString(), score, risk_level:risk, findings, headers:hdr, created_at:new Date().toISOString() }])
    });
    if (!ins.ok) return json({ ok:false, error:'supabase_insert_failed', detail: await ins.text() }, 500);
    const [row] = await ins.json();
    return json({ ok:true, report_id:row.id, score, risk, report_url:`/api/report/${row.id}` });
  }catch(e){ return json({ ok:false, error:'bad_request', detail:e.message }, 400); }
}
function json(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers:{ 'Content-Type':'application/json' } }); }
