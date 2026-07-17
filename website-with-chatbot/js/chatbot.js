/**
 * BYD Malaysia — AI Chatbot Widget
 * Answers questions about offers, promotions, and BYD models
 */

(function() {
    'use strict';

    const widget = document.getElementById('chatbotWidget');
    const toggleBtn = document.getElementById('chatbotToggle');
    const messagesEl = document.getElementById('chatbotMessages');
    const inputEl = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('chatbotSend');
    const quickReplies = document.getElementById('chatbotQuickReplies');

    let isOpen = false;

    // ===== Toggle Chatbot =====
    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            widget.classList.add('open');
            inputEl.focus();
        } else {
            widget.classList.remove('open');
        }
    });

    // ===== Send Message =====
    function sendMessage() {
        const message = inputEl.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        inputEl.value = '';
        sendBtn.disabled = true;

        const typingEl = addTypingIndicator();

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        })
        .then(res => res.json())
        .then(data => {
            removeTypingIndicator(typingEl);
            addMessage(data.reply, 'bot');
        })
        .catch(() => {
            removeTypingIndicator(typingEl);
            addMessage("Sorry, I'm having trouble connecting. Please try again later. 😔", 'bot');
        });
    }

    sendBtn.addEventListener('click', sendMessage);

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    inputEl.addEventListener('input', () => {
        sendBtn.disabled = !inputEl.value.trim();
    });

    sendBtn.disabled = true;

    // ===== Quick Replies =====
    quickReplies.addEventListener('click', (e) => {
        const btn = e.target.closest('.chatbot-quick-btn');
        if (!btn) return;
        const query = btn.dataset.query;
        inputEl.value = query;
        sendMessage();
    });

    // ===== Helpers =====
    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `chatbot-message ${type}`;
        div.innerHTML = formatMessage(text);
        messagesEl.appendChild(div);
        scrollToBottom();
        return div;
    }

    function addTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'chatbot-typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(div);
        scrollToBottom();
        return div;
    }

    function removeTypingIndicator(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function formatMessage(text) {
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\n/g, '<br>');
        return text;
    }

})();
