(() => {
  'use strict';
  const sidebar = document.getElementById('adminSidebar'), toggle = document.getElementById('adminMenuToggle'), close = document.getElementById('collapseSidebar');
  const backdrop = document.createElement('button'); backdrop.type='button'; backdrop.className='admin-drawer-backdrop'; backdrop.setAttribute('aria-label','Close navigation'); backdrop.tabIndex=-1; sidebar.before(backdrop);
  const mobile = () => matchMedia('(max-width:760px)').matches;
  function setOpen(open, restore=true) {
    sidebar.classList.toggle('drawer-open',open); backdrop.classList.toggle('open',open); document.body.classList.toggle('drawer-visible',open); toggle.setAttribute('aria-expanded',String(open));
    if (mobile()) sidebar.inert = !open;
    if (open) { sidebar.setAttribute('role','dialog'); sidebar.setAttribute('aria-modal','true'); sidebar.setAttribute('aria-label','Manager navigation'); (sidebar.querySelector('.nav-item.active') || close).focus(); }
    else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); if (restore) toggle.focus(); }
  }
  toggle.onclick = () => setOpen(!sidebar.classList.contains('drawer-open'));
  backdrop.onclick = () => setOpen(false);
  close.addEventListener('click',event => { if (mobile()) { event.stopImmediatePropagation(); setOpen(false); } },true);
  sidebar.querySelector('nav').addEventListener('click',event => { if (mobile() && event.target.closest('button')) setOpen(false); });
  document.addEventListener('keydown',event => {
    if (!sidebar.classList.contains('drawer-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') { const items=[...sidebar.querySelectorAll('button,a[href]')].filter(el=>el.offsetParent!==null),first=items[0],last=items.at(-1); if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} }
  });
  function resize(){ setOpen(false,false); sidebar.inert=mobile(); close.innerHTML=mobile()?'Close':BYDIcons.chevron; close.setAttribute('aria-label',mobile()?'Close navigation':'Minimize sidebar'); }
  window.addEventListener('resize',resize); resize();
})();
