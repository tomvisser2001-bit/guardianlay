<script>
(function(){
  // mobiel menu toggler
  const toggle = document.querySelector('[data-nav-toggle]');
  if (toggle) toggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('nav-open');
  });

  // active link highlight
  const path = location.pathname.replace(/\/+$/,'') || '/';
  document.querySelectorAll('a[data-nav]').forEach(a=>{
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });

  // zorg dat prijzen altijd naar /pricing.html gaat
  document.querySelectorAll('[data-go-pricing]').forEach(el=>{
    el.addEventListener('click', e=>{
      e.preventDefault();
      location.href = '/pricing.html';
    });
  });
})();
</script>
