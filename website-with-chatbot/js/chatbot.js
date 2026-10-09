(() => {
  'use strict';
  const widget = document.getElementById('chatbotWidget'), toggle = document.getElementById('chatbotToggle'), messages = document.getElementById('chatbotMessages'), input = document.getElementById('chatbotInput'), send = document.getElementById('chatbotSend'), quick = document.getElementById('chatbotQuickReplies');
  let busy = false, conversationId = null;
  try { conversationId = sessionStorage.getItem('byd-conversation'); } catch (_) {}
  input.maxLength = 1000;
  messages.setAttribute('aria-live', 'polite'); messages.setAttribute('role', 'log');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.onclick = () => { const open = widget.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); if (open) input.focus(); };
  const notice = document.createElement('p'); notice.className = 'chatbot-privacy'; notice.textContent = 'Chats and your IP address are stored until manually deleted by an administrator. Messages are sent to our AI provider to generate replies. Please avoid sensitive personal information.';
  document.querySelector('.chatbot-input-wrap').before(notice);
  const header = document.querySelector('.chatbot-header-info p'); header.textContent = 'Sales information · English / BM / 中文';
  messages.firstElementChild.textContent = 'Hello! Ask about our vehicles, current promotions, warranty, charging or branches. I answer using information published by our team.';
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'chatbot-quick-btn'; reset.textContent = 'New chat';
  reset.onclick = () => { if (busy) return; conversationId = null; try { sessionStorage.removeItem('byd-conversation'); } catch (_) {} messages.replaceChildren(); add('How can I help you?', 'bot'); }; quick.append(reset);
  function add(text, role) { const div = document.createElement('div'); div.className = 'chatbot-message ' + role; div.textContent = text; messages.append(div); messages.scrollTop = messages.scrollHeight; return div; }
  function update() { send.disabled = busy || !input.value.trim(); quick.querySelectorAll('button').forEach(b => b.disabled = busy); }
  async function submit() {
    const message = input.value.trim(); if (!message || busy) return;
    busy = true; input.value = ''; update(); add(message, 'user'); const typing = add('…', 'bot');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, conversationId }), signal: AbortSignal.timeout(22000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reply || data.error || 'Unable to send. Please try again.');
      conversationId = data.conversationId; try { sessionStorage.setItem('byd-conversation', conversationId); } catch (_) {}
      typing.textContent = data.reply;
      if (data.sources?.length) { const source = document.createElement('small'); source.className = 'chatbot-sources'; source.textContent = 'Sources: ' + data.sources.map(s => s.label).join(' · '); typing.append(source); }
    } catch (error) { typing.textContent = error.name === 'TimeoutError' ? 'The reply took too long. Please try again.' : error.message; }
    finally { busy = false; update(); messages.scrollTop = messages.scrollHeight; }
  }
  send.onclick = submit; input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) submit(); }); input.oninput = update;
  quick.addEventListener('click', event => { const button = event.target.closest('[data-query]'); if (button && !busy) { input.value = button.dataset.query; submit(); } });
  update();
})();
