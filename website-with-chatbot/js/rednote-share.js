/**
 * BYD Malaysia — RedNote (Xiaohongshu) Share
 * Opens RedNote with pre-written promotional content
 */

(function() {
    'use strict';

    const modal = document.getElementById('rednoteModal');
    const floatBtn = document.getElementById('rednoteFloatBtn');
    const closeBtn = document.getElementById('rednoteModalClose');
    const overlay = modal.querySelector('.rednote-modal-overlay');
    const copyBtn = document.getElementById('rednoteCopyBtn');
    const copyOnlyBtn = document.getElementById('rednoteCopyOnlyBtn');
    const preview = document.getElementById('rednoteNotePreview');

    // ===== Pre-written RedNote post content =====
    function getNoteContent() {
        const today = new Date().toLocaleDateString('en-MY', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        return `🚗⚡ BYD Malaysia — Build Your Dreams!

Just checked out the all-new BYD lineup in Malaysia and I'm seriously impressed! Here's what caught my eye:

🔹 BYD Seal — Premium electric sedan from RM 179,800
🔹 BYD Atto 3 — Family SUV from RM 149,800  
🔹 BYD Dolphin — City hatchback from RM 100,530
🔹 BYD Sealion 6 — Hybrid SUV, 1,092km range
🔹 BYD M6 — 7-seater electric MPV
🔹 BYD Shark 6 — Hybrid pickup coming soon!

Ask about current promos & cashback offers! 💰

#BYD #BYDMalaysia #ElectricVehicle #EV #SustainableMobility #BuildYourDreams #MalaysiaAuto #GoElectric`;
    }

    function updatePreview() {
        preview.textContent = getNoteContent();
    }

    // ===== Copy to Clipboard =====
    function copyToClipboard() {
        const text = getNoteContent();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied! ✅');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Copied! ✅');
        });
    }

    // ===== Open RedNote App =====
    function openRedNote() {
        const ua = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua);
        const isAndroid = /android/.test(ua);

        // Use an <a> tag click — most reliable across all mobile browsers
        const a = document.createElement('a');
        a.href = 'xhsdiscover://';
        a.style.display = 'none';
        a.target = '_self';
        document.body.appendChild(a);

        // Android: also try with iframe as fallback
        if (isAndroid) {
            // First attempt: anchor click
            a.click();

            // Second attempt after short delay: iframe (works on some Android browsers)
            setTimeout(() => {
                if (!document.hidden) {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = 'xhsdiscover://';
                    document.body.appendChild(iframe);
                    setTimeout(() => document.body.removeChild(iframe), 2000);
                }
            }, 500);
        } else {
            // iOS & desktop: anchor click is sufficient
            a.click();
        }

        setTimeout(() => document.body.removeChild(a), 100);

        // Fallback: if still here after 2.5s → app store
        setTimeout(() => {
            if (!document.hidden) {
                if (isAndroid) {
                    window.open('https://play.google.com/store/apps/details?id=com.xingin.xhs', '_blank');
                } else if (isIOS) {
                    window.open('https://apps.apple.com/app/id741292507', '_blank');
                } else {
                    window.open('https://www.xiaohongshu.com/explore', '_blank');
                }
            }
        }, 2500);
    }

    // ===== Toast Notification =====
    function showToast(message) {
        let toast = document.getElementById('rednote-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'rednote-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                background: #22c55e;
                color: #000;
                padding: 0.6rem 1.5rem;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 600;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    }

    // ===== Modal Controls =====
    function openModal() {
        updatePreview();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    floatBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Copy & Open RedNote — must open synchronously in click handler
    copyBtn.addEventListener('click', () => {
        openRedNote();       // synchronous: must happen NOW for iOS to allow
        copyToClipboard();   // async clipboard
    });

    // Copy Only
    copyOnlyBtn.addEventListener('click', () => {
        copyToClipboard();
    });

})();
