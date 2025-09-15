// --- Helpers ---
const qs = (sel) => document.querySelector(sel);
const getUTM = () => Object.fromEntries(new URLSearchParams(location.search).entries());
const postJSON = (url, body) => fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });

// --- UTM opslaan voor sessie ---
try { localStorage.setItem('guardianlay_utm', JSON.stringify(getUTM())); } catch {}

// --- WAITLIST ---
const wlForm = qs('#wlForm');
if (wlForm) {
  wlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = qs('#wlEmail').value.trim();
    const btn = qs('#wlBtn'); const msg = qs('#wlMsg');
    if (!email.includes('@')) { msg.textContent = 'Vul een geldig e-mailadres in.'; return; }
    btn.disabled = true; msg.textContent = 'Versturen...';
    const utm = JSON.parse(localStorage.getItem('guardianlay_utm')||'{}');
    const res = await postJSON('/api/waitlist', { email, source: 'landing-waitlist', utm }).catch(()=>({ok:false}));
    let data={}; try{ data = await res.json(); }catch{}
    if (res.ok && data.ok) { msg.textContent = data.already ? 'Je stond al op de lijst 👍' : 'Je staat op de wachtlijst 🎉'; wlForm.reset(); }
    else { msg.textContent = 'Niet gelukt: ' + (data.error || res.statusText || 'onbekend'); }
    btn.disabled = false;
  });
}

// --- SCAN ---
const sForm = qs('#scanForm');
if (sForm) {
  sForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = qs('#scanUrl').value.trim();
    const email = qs('#scanEmail').value.trim();
    const btn = qs('#scanBtn'); const msg = qs('#scanMsg');
    if (!/^https?:\/\//i.test(url)) { msg.textContent = 'Vul een geldige URL in (incl. https://).'; return; }
    if (!email.includes('@')) { msg.textContent = 'Vul een geldig e-mailadres in.'; return; }
    btn.disabled = true; btn.textContent = 'Scannen...'; msg.textContent = 'Bezig met scannen...';
    const utm = JSON.parse(localStorage.getItem('guardianlay_utm')||'{}');
    try {
      const res = await postJSON('/api/scan', { url, email, utm });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data.ok) {
        msg.innerHTML = `Klaar ✅ Score: <b>${data.score}</b> — <a href="${data.report_url}" target="_blank" rel="noopener">Bekijk rapport</a>`;
      } else {
        msg.textContent = 'Mislukt: ' + (data.error || res.statusText);
      }
    } catch (err) {
      msg.textContent = 'Netwerkfout, probeer opnieuw.';
    } finally {
      btn.disabled = false; btn.textContent = 'Scan nu';
    }
  });
}

// --- Minimal consent banner (no cookies set here) ---
(function(){
  const key='gl_consent'; const box=document.getElementById('consent');
  try {
    const v = localStorage.getItem(key);
    if (!v) box.style.display='block';
    const set = (state) => {
      localStorage.setItem(key, state);
      box.style.display='none';
      // Future: als je GA/ads toevoegt, stuur Consent Mode v2 signalen:
      // window.gtag && gtag('consent', 'update', {
      //   'ad_user_data': state==='granted'?'granted':'denied',
      //   'ad_personalization': state==='granted'?'granted':'denied',
      //   'ad_storage': state==='granted'?'granted':'denied',
      //   'analytics_storage': state==='granted'?'granted':'denied'
      // });
    };
    document.getElementById('cAccept').onclick = ()=>set('granted');
    document.getElementById('cReject').onclick = ()=>set('denied');
  } catch {}
})();
