const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const SOCIAL_DOCUMENT = 'social-links.json';
const socialFields = ['tiktokUrl', 'xhsUrl', 'googleReviewUrl'];
function externalUrl(value) {
  if (typeof value !== 'string' || /[\s\x00-\x1f\\]/.test(value)) return false;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
function imageUrl(value) { return typeof value === 'string' && (/^\/(?:assets|uploads)\/[a-zA-Z0-9_./%-]+$/.test(value) && !value.includes('..') || externalUrl(value)); }
function socialLinks(value = {}) { return Object.fromEntries(socialFields.map(key => [key, externalUrl(value[key]) ? value[key] : ''])); }
function validateSocialLinks(value = {}) {
  const result = {};
  for (const key of socialFields) {
    result[key] = String(value[key] || '').trim();
    if (result[key] && (result[key].length > 2048 || !externalUrl(result[key]))) throw new Error('Enter a valid http:// or https:// link, or leave the field empty.');
  }
  return result;
}
function publicBranch(branch) {
  const result = Object.fromEntries(['id','name','city','state','address','phone','email','hours'].map(key => [key, String(branch[key] || '')]));
  const query = encodeURIComponent([result.name, result.address].filter(Boolean).join(', '));
  result.image = imageUrl(branch.image) ? branch.image : '/assets/placeholder.svg';
  result.mapUrl = externalUrl(branch.mapUrl) ? branch.mapUrl : 'https://www.google.com/maps/search/?api=1&query=' + query;
  result.wazeUrl = externalUrl(branch.wazeUrl) ? branch.wazeUrl : 'https://waze.com/ul?q=' + query;
  return result;
}
function contactPage(branches, form) {
  const cards = branches.filter(branch => branch.published === true).map(publicBranch).map(branch => {
    const phone = branch.phone.replace(/[^+\d]/g, '');
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.email) ? branch.email : '';
    return `<article class="wp-branch-card" id="branch-${escape(branch.id)}"><img class="wp-branch-photo" src="${escape(branch.image)}" alt="${branch.image === '/assets/placeholder.svg' ? 'Showroom photograph unavailable' : escape(branch.name + ' showroom')}" width="1600" height="900" loading="lazy" decoding="async"><div class="wp-branch-copy"><h2>${escape(branch.name)}</h2><address>${escape(branch.address)}</address><dl>${branch.phone ? `<div><dt>Phone</dt><dd>${phone ? `<a href="tel:${escape(phone)}">${escape(branch.phone)}</a>` : escape(branch.phone)}</dd></div>` : ''}${email ? `<div><dt>Email</dt><dd><a href="mailto:${escape(email)}">${escape(email)}</a></dd></div>` : ''}${branch.hours ? `<div><dt>Opening hours</dt><dd class="wp-branch-hours">${escape(branch.hours)}</dd></div>` : ''}</dl><div class="wp-branch-directions"><a class="wp-action" href="${escape(branch.mapUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open Google Maps for ${escape(branch.name)}">GOOGLE MAPS</a><a class="wp-action outline" href="${escape(branch.wazeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open Waze for ${escape(branch.name)}">WAZE</a></div></div></article>`;
  }).join('');
  return `<main id="main" class="site-main wp-dealership-page"><header class="wp-dealership-heading"><h1>CONTACT US</h1><p>Visit our showroom and discover BYD with Millennium Motors.</p></header><section class="wp-branch-grid" aria-label="Our showrooms">${cards || '<p class="wp-empty">Our showroom details are being updated. Please check back soon.</p>'}</section><section id="register-section" class="wp-contact-enquiry" aria-labelledby="contact-enquiry-title"><div><h2 id="contact-enquiry-title">REGISTER INTEREST</h2>${form}</div></section></main>`;
}
function aboutPage() {
  return `<main id="main" class="site-main wp-dealership-page wp-about-page"><header class="wp-dealership-heading"><h1>ABOUT US</h1></header><section class="wp-about-intro" aria-labelledby="about-intro-title"><div><h2 id="about-intro-title">Your one-stop automotive destination</h2><p>Autobeyond, a part of Millennium Group, is your comprehensive destination for BYD vehicles. Located strategically in Cheras, Kuala Lumpur, our 4S center offers a spacious showroom to showcase various car models available and a fully equipped service facility.</p><p>Expect exceptional service as we prioritize personalized customer care with our dedicated and knowledgeable staff. Come and discover BYD the Autobeyond way.</p></div><img src="/assets/wordpress/788a12729a3f4326.webp" width="940" height="852" alt="BYD Millennium showroom in Cheras" fetchpriority="high" decoding="async"></section><section class="wp-about-services" aria-labelledby="about-services-title"><div class="wp-about-services-inner"><div><h2 id="about-services-title">Beyond expectations</h2><p>In addition to being a car 4S dealership, we offer automobile enhancement and repair services, along with electric charging facilities to enhance your ownership experience.</p></div><ul><li>BYD vehicle showroom</li><li>Sales &amp; aftersales service</li><li>Automobile enhancement &amp; repair</li><li>Electric charging facilities</li></ul></div></section><section class="wp-about-purpose" aria-label="Our vision and mission"><div><h2>Our vision</h2><p>Live up to the brand values of Sales &amp; Aftersales Service within the network by creating a great brand impact, more comparative advantages, and being flexible in systems and mechanisms.</p></div><div><h2>Our mission</h2><p>Dedication to the highest quality of customer service delivered with the sense of warmth, friendliness, personalized touch to create an exciting experience for a green and intelligent future.</p></div></section><section class="wp-about-values" aria-labelledby="about-values-title"><h2 id="about-values-title">Our values</h2><ul>${['Respect','Appreciation','Trust','Transparency','Openness','Sustainability'].map(value => `<li>${value}</li>`).join('')}</ul></section><section class="wp-about-enquiry"><div><h2>Discover BYD the Autobeyond way.</h2><a class="wp-action" href="/contact#register-section">ENQUIRE NOW</a></div></section></main>`;
}
const socialIcons = {
  tiktokUrl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47v3.1a1.5 1.5 0 1 0 1 1.37V3h3c.4 2.3 2.1 4 5 4v3c-2 0-3.7-.6-5-1.8"/></svg>',
  xhsUrl: '<span class="wp-social-wordmark" aria-hidden="true">XHS</span>',
  googleReviewUrl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 7.2A9 9 0 1 0 21 15v-4h-9v3h5.8a6 6 0 1 1-1-5.7"/></svg>'
};
function footer(value) {
  const links = socialLinks(value);
  const original = [
    ['Facebook','https://www.facebook.com/profile.php?id=100087561052744','27296417c2bf93fe.webp'],
    ['Instagram','https://www.instagram.com/byd_millenniumautobeyond/','f3846a63cedd5bf8.webp'],
    ['WhatsApp','https://wa.me/+60128228645','e5647cdf926e1aa9.webp']
  ].map(([label,href,image]) => `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}"><img src="/assets/wordpress/${image}" alt="" width="24" height="24" loading="lazy"></a>`).join('');
  const extra = [['tiktokUrl','TikTok'],['xhsUrl','XHS'],['googleReviewUrl','Google reviews']].filter(([key]) => links[key]).map(([key,label]) => `<a href="${escape(links[key])}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}" data-social="${key}">${socialIcons[key]}</a>`).join('');
  return `<footer id="colophon" class="wp-public-footer" role="contentinfo"><div class="wp-footer-top"><a class="wp-footer-logo" href="/" aria-label="BYD Millennium Motors home"><img src="/assets/wordpress/f8a7d490db4c5ff1.png" alt="BYD Millennium Motors" width="280" height="80" loading="lazy"></a><nav class="wp-footer-social" aria-label="Follow Millennium Motors">${original}${extra}</nav></div><div class="wp-footer-bottom"><span>© ${new Date().getFullYear()} BYD Millennium Motors</span><span>Privacy Policy</span><span>Legal Notice</span></div></footer>`;
}
function initializePageTransition() {
  const root = document.documentElement, duration = 1000, key = 'byd-page-transition';
  const historyNavigation = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  const locked = [];
  let pending, timer, readyStarted = false, leaving = false;
  try { pending = JSON.parse(sessionStorage.getItem(key)); sessionStorage.removeItem(key); } catch {}
  const incoming = pending && typeof pending.href === 'string' && pending.href === location.href && Number.isFinite(pending.until) && pending.until >= Date.now() - 30000 && pending.until <= Date.now() + duration;
  let until = incoming ? pending.until : 0;
  function show() { root.classList.add('wp-page-leaving'); root.setAttribute('aria-busy', 'true'); }
  function clear() {
    clearTimeout(timer); root.classList.remove('wp-page-leaving'); root.removeAttribute('aria-busy');
    for (const [element, wasInert] of locked.splice(0)) element.inert = wasInert;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(clear, Math.max(0, until - Date.now())); }
  function ready() {
    if (readyStarted || leaving) return;
    readyStarted = true;
    if (historyNavigation) return clear();
    if (!incoming) until = Date.now() + duration;
    if (until <= Date.now()) return clear();
    show();
    for (const element of document.querySelectorAll('#masthead,#main,#colophon')) { locked.push([element, element.inert]); element.inert = true; }
    schedule();
  }
  window.BYDPageTransition = {
    begin(href) {
      leaving = true; until = Date.now() + duration;
      try { sessionStorage.setItem(key, JSON.stringify({ href, until })); } catch {}
      show(); schedule(); // Release a cancelled navigation after the same one second.
    }
  };
  if (!historyNavigation && (!incoming || until > Date.now())) show();
  timer = setTimeout(clear, 4000); // Recovery if document readiness is interrupted.
  document.addEventListener('DOMContentLoaded', ready, { once:true });
  addEventListener('pageshow', event => { if (event.persisted) clear(); else ready(); });
  addEventListener('pagehide', clear);
}
const transitionHead = `<script>(${initializePageTransition.toString()})()</script>`;
const transitionOverlay = '<div class="wp-page-transition" aria-hidden="true"><img src="/assets/wordpress/f8a7d490db4c5ff1.png" alt="" width="360" height="100"></div>';
module.exports = { SOCIAL_DOCUMENT, externalUrl, imageUrl, socialLinks, validateSocialLinks, publicBranch, contactPage, aboutPage, footer, transitionHead, transitionOverlay };
