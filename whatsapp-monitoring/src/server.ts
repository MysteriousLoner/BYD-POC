import http from 'http';
import QRCode from 'qrcode';
import { config } from './config.js';
import { initDB, closeDB, getDashboardStats, getSalesmanKPIs, getSalesmanContactStats, getRecentMessages, getTodayStats, getAllSalesmen } from './db/store.js';
import {
  initializeWhatsApp,
  getAllQRCodes,
  getAllInstances,
  getQRCode,
  sendMessage,
  disconnectInstance,
  logoutInstance,
  disconnectAll,
} from './whatsapp/baileys.js';

// ─── Helper: JSON Response ──────────────────────────────────────────────

function jsonResponse(res: http.ServerResponse, data: any, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: http.ServerResponse, html: string, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ─── Parse JSON Body ────────────────────────────────────────────────────

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// ─── Dashboard HTML ─────────────────────────────────────────────────────

function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sales KPI Platform</title>
  <style>
    :root {
      --bg: #0f172a; --card: #1e293b; --border: #334155;
      --text: #f1f5f9; --muted: #94a3b8; --accent: #3b82f6;
      --green: #22c55e; --red: #ef4444; --yellow: #eab308;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--muted); }
    .subtitle { color: var(--muted); font-size: 14px; margin-bottom: 32px; }

    /* Stat Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .stat-card .label { font-size: 13px; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 32px; font-weight: 700; }
    .stat-card .value.green { color: var(--green); }
    .stat-card .value.blue { color: var(--accent); }
    .stat-card .value.yellow { color: var(--yellow); }

    /* Sections */
    .section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h2 { margin-bottom: 0; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
    th { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    tr:hover { background: rgba(59,130,246,0.05); }

    /* Buttons */
    .btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-danger { background: var(--red); color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--border); }
    .btn-sm { padding: 4px 10px; font-size: 12px; }

    /* Status Badges */
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-online { background: rgba(34,197,94,0.15); color: var(--green); }
    .badge-offline { background: rgba(239,68,68,0.15); color: var(--red); }
    .badge-waiting { background: rgba(234,179,8,0.15); color: var(--yellow); }

    /* QR Modal */
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; text-align: center; max-width: 400px; width: 90%; }
    .modal-content img { max-width: 256px; margin: 16px 0; border-radius: 8px; }
    .modal-content .instructions { font-size: 14px; color: var(--muted); margin: 12px 0; }
    .modal-content .close-btn { margin-top: 16px; }

    /* Loading */
    .loading { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Tabs */
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; }
    .tab { padding: 8px 16px; border: none; background: transparent; color: var(--muted); cursor: pointer; border-radius: 8px; font-size: 14px; transition: all 0.2s; }
    .tab:hover { background: rgba(59,130,246,0.1); }
    .tab.active { background: var(--accent); color: white; }

    /* Form */
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: 14px; }
    .form-row { display: flex; gap: 12px; }
    .form-row .form-group { flex: 1; }

    .refresh-indicator { font-size: 12px; color: var(--muted); }
    .empty-state { text-align: center; padding: 40px; color: var(--muted); }
    .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Sales KPI Platform</h1>
    <p class="subtitle">WhatsApp Activity Monitoring Dashboard</p>

    <!-- Stats Overview -->
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="label">Total Messages</div><div class="value blue" id="statTotal">-</div></div>
      <div class="stat-card"><div class="label">Messages Sent</div><div class="value green" id="statSent">-</div></div>
      <div class="stat-card"><div class="label">Messages Received</div><div class="value yellow" id="statRecv">-</div></div>
      <div class="stat-card"><div class="label">Customers</div><div class="value" id="statContacts">-</div></div>
      <div class="stat-card"><div class="label">Salesmen</div><div class="value" id="statSalesmen">-</div></div>
      <div class="stat-card"><div class="label">Online Now</div><div class="value green" id="statOnline">-</div></div>
    </div>

    <!-- Salesmen Section -->
    <div class="section">
      <div class="section-header">
        <h2>👥 Sales Team</h2>
        <div style="display:flex;gap:8px">
          <span class="refresh-indicator" id="refreshTime"></span>
          <button class="btn btn-primary" onclick="showAddSalesman()">+ Add Salesman</button>
          <button class="btn btn-outline" onclick="refreshAll()">🔄 Refresh</button>
        </div>
      </div>
      <div id="salesmenContent">
        <div class="empty-state"><div class="icon">👤</div><p>No salesmen registered yet. Click "+ Add Salesman" to get started.</p></div>
      </div>
    </div>

    <!-- Today's KPIs -->
    <div class="section">
      <h2>📅 Today's Activity</h2>
      <div id="todayContent">
        <div class="empty-state"><p>Loading...</p></div>
      </div>
    </div>

    <!-- Recent Messages -->
    <div class="section">
      <div class="section-header">
        <h2>💬 Recent Messages</h2>
        <select id="salesmanFilter" onchange="loadRecentMessages()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;">
          <option value="">All Salesmen</option>
        </select>
      </div>
      <div id="messagesContent">
        <div class="empty-state"><p>Loading...</p></div>
      </div>
    </div>
  </div>

  <!-- QR Code Modal -->
  <div class="modal" id="qrModal">
    <div class="modal-content">
      <h2>📱 Bind WhatsApp</h2>
      <p class="instructions">Scan this QR code with WhatsApp on your phone to link your account.</p>
      <img id="qrImage" src="" alt="QR Code" />
      <p class="instructions" style="font-size:12px">
        1. Open WhatsApp on your phone<br>
        2. Go to Settings → Linked Devices<br>
        3. Tap "Link a Device"<br>
        4. Scan the QR code above
      </p>
      <div id="qrStatus" style="margin:12px 0;">
        <span class="loading"></span> Waiting for scan...
      </div>
      <button class="btn btn-outline close-btn" onclick="closeQRModal()">Cancel</button>
    </div>
  </div>

  <!-- Add Salesman Modal -->
  <div class="modal" id="addModal">
    <div class="modal-content">
      <h2>➕ Add Salesman</h2>
      <div class="form-group">
        <label>Salesman Name</label>
        <input type="text" id="addName" placeholder="e.g. John Doe" />
      </div>
      <div class="form-group">
        <label>Phone Number (optional)</label>
        <input type="text" id="addPhone" placeholder="+6512345678" />
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
        <button class="btn btn-primary" onclick="addSalesman()">Create & Get QR</button>
        <button class="btn btn-outline" onclick="closeAddModal()">Cancel</button>
      </div>
    </div>
  </div>

  <script>
    let qrPollInterval = null;
    let currentQrInstanceId = null;

    // ── Refresh All ────────────────────────────────────────────────
    async function refreshAll() {
      await Promise.all([loadStats(), loadSalesmen(), loadToday(), loadRecentMessages()]);
      document.getElementById('refreshTime').textContent = 'Updated ' + new Date().toLocaleTimeString();
    }

    // ── Stats ──────────────────────────────────────────────────────
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('statTotal').textContent = data.totalMessages.toLocaleString();
        document.getElementById('statSent').textContent = data.totalSent.toLocaleString();
        document.getElementById('statRecv').textContent = data.totalReceived.toLocaleString();
        document.getElementById('statContacts').textContent = data.totalContacts.toLocaleString();
        document.getElementById('statSalesmen').textContent = data.totalSalesmen.toLocaleString();
        document.getElementById('statOnline').textContent = data.connectedSalesmen.toLocaleString();
      } catch (err) { console.error(err); }
    }

    // ── Salesmen ───────────────────────────────────────────────────
    async function loadSalesmen() {
      try {
        const res = await fetch('/api/salesmen');
        const salesmen = await res.json();
        const filter = document.getElementById('salesmanFilter');
        filter.innerHTML = '<option value="">All Salesmen</option>';

        if (salesmen.length === 0) {
          document.getElementById('salesmenContent').innerHTML =
            '<div class="empty-state"><div class="icon">👤</div><p>No salesmen registered yet.</p></div>';
          return;
        }

        let html = '<table><thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Today Sent</th><th>Today Recv</th><th>Contacts</th><th>Actions</th></tr></thead><tbody>';

        for (const s of salesmen) {
          filter.innerHTML += '<option value="' + s.id + '">' + s.name + '</option>';
          const statusBadge = s.connected
            ? '<span class="badge badge-online">● Online</span>'
            : '<span class="badge badge-offline">○ Offline</span>';

          html += '<tr>' +
            '<td><strong>' + s.name + '</strong></td>' +
            '<td>' + (s.phone || '-') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + (s.sent_today || 0) + '</td>' +
            '<td>' + (s.received_today || 0) + '</td>' +
            '<td>' + (s.contacts_today || 0) + '</td>' +
            '<td>' +
              (s.connected
                ? '<button class="btn btn-danger btn-sm" data-instance="' + s.instance_id + '" onclick="disconnectSalesman(this.dataset.instance)">Disconnect</button>'
                : '<button class="btn btn-primary btn-sm" data-instance="' + s.instance_id + '" data-name="' + s.name + '" data-phone="' + (s.phone || '') + '" onclick="reconnectSalesman(this.dataset.instance,this.dataset.name,this.dataset.phone)">Connect</button>') +
              ' <button class="btn btn-outline btn-sm" onclick="viewDetails(' + s.id + ')">Details</button>' +
              ' <button class="btn btn-danger btn-sm" data-instance="' + s.instance_id + '" onclick="deleteSalesman(this.dataset.instance)">🗑</button>' +
            '</td>' +
            '</tr>';
        }

        html += '</tbody></table>';
        document.getElementById('salesmenContent').innerHTML = html;
      } catch (err) { console.error(err); }
    }

    // ── Today KPIs ─────────────────────────────────────────────────
    async function loadToday() {
      try {
        const res = await fetch('/api/today');
        const data = await res.json();
        if (data.length === 0) {
          document.getElementById('todayContent').innerHTML =
            '<div class="empty-state"><p>No activity recorded today.</p></div>';
          return;
        }

        let html = '<table><thead><tr><th>Salesman</th><th>Status</th><th>Sent Today</th><th>Received Today</th><th>Total</th><th>Unique Contacts</th></tr></thead><tbody>';
        for (const row of data) {
          const statusBadge = row.connected
            ? '<span class="badge badge-online">Online</span>'
            : '<span class="badge badge-offline">Offline</span>';
          html += '<tr>' +
            '<td><strong>' + row.name + '</strong></td>' +
            '<td>' + statusBadge + '</td>' +
            '<td style="color:var(--green)">' + row.sent_today + '</td>' +
            '<td style="color:var(--yellow)">' + row.received_today + '</td>' +
            '<td><strong>' + (row.sent_today + row.received_today) + '</strong></td>' +
            '<td>' + row.contacts_today + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        document.getElementById('todayContent').innerHTML = html;
      } catch (err) { console.error(err); }
    }

    // ── Recent Messages ────────────────────────────────────────────
    async function loadRecentMessages() {
      try {
        const salesmanId = document.getElementById('salesmanFilter').value;
        const url = salesmanId ? '/api/messages?salesmanId=' + salesmanId : '/api/messages';
        const res = await fetch(url);
        const data = await res.json();
        if (data.length === 0) {
          document.getElementById('messagesContent').innerHTML =
            '<div class="empty-state"><p>No messages recorded yet. Messages will appear here as salesmen communicate.</p></div>';
          return;
        }

        let html = '<table><thead><tr><th>Time</th><th>Salesman</th><th>Contact</th><th>Direction</th><th>Type</th><th>Content</th></tr></thead><tbody>';
        for (const m of data) {
          const time = new Date(m.timestamp).toLocaleString();
          const directionBadge = m.direction === 'sent'
            ? '<span style="color:var(--green)">📤 Sent</span>'
            : '<span style="color:var(--yellow)">📥 Received</span>';
          const typeIcon = m.has_media ? '📎 Media' : '💬 Text';
          const content = m.content
            ? (m.content.length > 60 ? m.content.substring(0, 60) + '...' : m.content)
            : (m.has_media ? '[Media]' : '');

          html += '<tr>' +
            '<td style="white-space:nowrap;font-size:12px;color:var(--muted)">' + time + '</td>' +
            '<td>' + m.salesman_name + '</td>' +
            '<td>' + (m.contact_name || m.contact_phone) + '</td>' +
            '<td>' + directionBadge + '</td>' +
            '<td>' + typeIcon + '</td>' +
            '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + content + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        document.getElementById('messagesContent').innerHTML = html;
      } catch (err) { console.error(err); }
    }

    // ── Add Salesman ───────────────────────────────────────────────
    function showAddSalesman() {
      document.getElementById('addModal').classList.add('active');
    }

    function closeAddModal() {
      document.getElementById('addModal').classList.remove('active');
    }

    async function addSalesman() {
      const name = document.getElementById('addName').value.trim();
      const phone = document.getElementById('addPhone').value.trim() || null;
      if (!name) { alert('Please enter a name'); return; }

      try {
        const res = await fetch('/api/salesmen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone })
        });
        const data = await res.json();
        closeAddModal();
        document.getElementById('addName').value = '';
        document.getElementById('addPhone').value = '';
        // Open QR modal
        openQRModal(data.instanceId, name);
      } catch (err) {
        alert('Failed to create salesman: ' + err.message);
      }
    }

    // ── QR Code ────────────────────────────────────────────────────
    function openQRModal(instanceId, name) {
      currentQrInstanceId = instanceId;
      document.getElementById('qrModal').classList.add('active');
      document.getElementById('qrImage').src = '';
      document.getElementById('qrStatus').innerHTML = '<span class="loading"></span> Waiting for QR code...';
      pollQR();
      qrPollInterval = setInterval(pollQR, 2000);
    }

    function closeQRModal() {
      document.getElementById('qrModal').classList.remove('active');
      if (qrPollInterval) { clearInterval(qrPollInterval); qrPollInterval = null; }
      currentQrInstanceId = null;
      refreshAll();
    }

    async function pollQR() {
      if (!currentQrInstanceId) return;
      try {
        const res = await fetch('/api/qr/' + currentQrInstanceId);
        const data = await res.json();
        if (data.qr) {
          document.getElementById('qrImage').src = data.qr;
          document.getElementById('qrStatus').innerHTML =
            '<p style="color:var(--yellow)">📱 Scan the QR code above with WhatsApp</p>';
        } else if (data.connected) {
          document.getElementById('qrStatus').innerHTML =
            '<p style="color:var(--green)">✅ Connected successfully!</p>';
          if (qrPollInterval) { clearInterval(qrPollInterval); qrPollInterval = null; }
          setTimeout(closeQRModal, 2000);
        } else {
          document.getElementById('qrStatus').innerHTML =
            '<span class="loading"></span> Initializing connection...';
        }
      } catch (err) { console.error(err); }
    }

    // ── Actions ────────────────────────────────────────────────────
    async function reconnectSalesman(instanceId, name, phone) {
      try {
        await fetch('/api/salesmen/' + instanceId + '/connect', { method: 'POST' });
        openQRModal(instanceId, name);
      } catch (err) { alert('Failed: ' + err.message); }
    }

    async function disconnectSalesman(instanceId) {
      if (!confirm('Disconnect this salesman?')) return;
      try {
        await fetch('/api/salesmen/' + instanceId + '/disconnect', { method: 'POST' });
        refreshAll();
      } catch (err) { alert('Failed: ' + err.message); }
    }

    async function deleteSalesman(instanceId) {
      if (!confirm('Delete this salesman and all their data? This cannot be undone.')) return;
      try {
        await fetch('/api/salesmen/' + instanceId, { method: 'DELETE' });
        refreshAll();
      } catch (err) { alert('Failed: ' + err.message); }
    }

    function viewDetails(salesmanId) {
      alert('Salesman ID: ' + salesmanId + '\\n\\nDetailed view coming soon. Check the table below for recent messages filtered by salesman.');
      document.getElementById('salesmanFilter').value = salesmanId;
      loadRecentMessages();
    }

    // ── Init ───────────────────────────────────────────────────────
    refreshAll();
    setInterval(refreshAll, 15000); // Auto-refresh every 15s
  </script>
</body>
</html>`;
}

// ─── QR Page (for binding) ──────────────────────────────────────────────

async function renderQRPage(instanceId: string, name: string): Promise<string> {
  // Get QR from the Baileys instance
  const qrData = await new Promise<string | null>((resolve) => {
    const qr = getQRCode(instanceId);
    resolve(qr?.qr || null);
  });

  const qrDataUrl = qrData ? await QRCode.toDataURL(qrData) : '';
  const connected = !qrData && qrData !== undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bind WhatsApp — ${name}</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f1f5f9; --muted: #94a3b8; --accent: #3b82f6; --green: #22c55e; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; text-align: center; max-width: 420px; width: 90%; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .muted { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
    img { max-width: 256px; border-radius: 8px; margin: 16px auto; display: block; border: 8px solid white; }
    .steps { text-align: left; font-size: 13px; color: var(--muted); margin: 20px 0; line-height: 1.8; }
    .steps span { color: var(--accent); font-weight: 600; margin-right: 4px; }
    .connected { color: var(--green); font-size: 18px; margin: 20px 0; }
    .loading { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <meta http-equiv="refresh" content="${connected ? '3;url=/' : '5'}">
</head>
<body>
  <div class="card">
    <h1>📱 ${name}</h1>
    <p class="muted">Sales KPI Platform — WhatsApp Binding</p>
    ${connected
      ? '<p class="connected">✅ WhatsApp Connected!</p><p class="muted">Redirecting to dashboard...</p>'
      : qrDataUrl
        ? `<img src="${qrDataUrl}" alt="QR Code" /><p style="color:#eab308;margin:12px 0">Scan this QR code with WhatsApp</p>
           <div class="steps">
             <p><span>1.</span> Open WhatsApp on your phone</p>
             <p><span>2.</span> Settings → Linked Devices</p>
             <p><span>3.</span> Tap "Link a Device"</p>
             <p><span>4.</span> Scan the QR code</p>
           </div>
           <p class="muted">Page refreshes every 5 seconds</p>`
        : '<p><span class="loading"></span> Initializing WhatsApp connection...</p><p class="muted">Page refreshes every 5 seconds</p>'
    }
  </div>
</body>
</html>`;
}

// ─── API Routes ─────────────────────────────────────────────────────────

async function handleAPI(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    jsonResponse(res, { ok: true });
    return true;
  }

  // GET /api/stats — dashboard overview
  if (req.method === 'GET' && pathname === '/api/stats') {
    const stats = getDashboardStats();
    jsonResponse(res, stats);
    return true;
  }

  // GET /api/salesmen — all salesmen with today's KPIs
  if (req.method === 'GET' && pathname === '/api/salesmen') {
    const data = getTodayStats();
    jsonResponse(res, data);
    return true;
  }

  // POST /api/salesmen — create new salesman
  if (req.method === 'POST' && pathname === '/api/salesmen') {
    const body = await parseBody(req);
    const { name, phone } = body;

    if (!name) {
      jsonResponse(res, { error: 'Name is required' }, 400);
      return true;
    }

    // Generate unique instance ID
    const instanceId = 'salesman_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    // Initialize WhatsApp in background (don't await — QR will be ready shortly)
    initializeWhatsApp(instanceId, name, phone || null).catch((err) => {
      console.error(`[server] Failed to initialize WhatsApp for ${name}:`, err);
    });

    jsonResponse(res, { instanceId, name, phone, message: 'Salesman created. Scan QR to bind WhatsApp.' }, 201);
    return true;
  }

  // POST /api/salesmen/:instanceId/connect — reconnect
  const connectMatch = pathname.match(/^\/api\/salesmen\/(.+)\/connect$/);
  if (req.method === 'POST' && connectMatch) {
    const instanceId = connectMatch[1];
    const salesmen = getAllSalesmen();
    const sm = salesmen.find((s: any) => s.instance_id === instanceId);
    if (!sm) {
      jsonResponse(res, { error: 'Salesman not found' }, 404);
      return true;
    }
    initializeWhatsApp(instanceId, sm.name, sm.phone).catch(console.error);
    jsonResponse(res, { message: 'Reconnecting...' });
    return true;
  }

  // POST /api/salesmen/:instanceId/disconnect
  const disconnectMatch = pathname.match(/^\/api\/salesmen\/(.+)\/disconnect$/);
  if (req.method === 'POST' && disconnectMatch) {
    const instanceId = disconnectMatch[1];
    await disconnectInstance(instanceId);
    jsonResponse(res, { message: 'Disconnected' });
    return true;
  }

  // DELETE /api/salesmen/:instanceId
  const deleteMatch = pathname.match(/^\/api\/salesmen\/(.+)$/);
  if (req.method === 'DELETE' && deleteMatch && !pathname.includes('/connect') && !pathname.includes('/disconnect')) {
    const instanceId = deleteMatch[1];
    await logoutInstance(instanceId);
    jsonResponse(res, { message: 'Deleted' });
    return true;
  }

  // GET /api/qr/:instanceId — poll QR code
  const qrMatch = pathname.match(/^\/api\/qr\/(.+)$/);
  if (req.method === 'GET' && qrMatch) {
    const instanceId = qrMatch[1];
    const qrData = getAllQRCodes().find((q) => q.instanceId === instanceId);
    const instance = getAllInstances().find((i) => i.instanceId === instanceId);

    if (instance?.connected) {
      jsonResponse(res, { connected: true, qr: null });
    } else if (qrData?.qr) {
      const qrDataUrl = await QRCode.toDataURL(qrData.qr);
      jsonResponse(res, { connected: false, qr: qrDataUrl });
    } else {
      jsonResponse(res, { connected: false, qr: null, waiting: true });
    }
    return true;
  }

  // GET /api/today — today's KPI per salesman
  if (req.method === 'GET' && pathname === '/api/today') {
    const data = getTodayStats();
    jsonResponse(res, data);
    return true;
  }

  // GET /api/messages — recent messages
  if (req.method === 'GET' && pathname === '/api/messages') {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const salesmanId = url.searchParams.get('salesmanId');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const data = getRecentMessages(salesmanId ? parseInt(salesmanId, 10) : null, limit);
    jsonResponse(res, data);
    return true;
  }

  // GET /api/salesmen/:id/kpi — salesman KPI history
  const kpiMatch = pathname.match(/^\/api\/salesmen\/(\d+)\/kpi$/);
  if (req.method === 'GET' && kpiMatch) {
    const salesmanId = parseInt(kpiMatch[1], 10);
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const data = getSalesmanKPIs(salesmanId, days);
    jsonResponse(res, data);
    return true;
  }

  // GET /api/salesmen/:id/contacts — salesman contact stats
  const contactsMatch = pathname.match(/^\/api\/salesmen\/(\d+)\/contacts$/);
  if (req.method === 'GET' && contactsMatch) {
    const salesmanId = parseInt(contactsMatch[1], 10);
    const data = getSalesmanContactStats(salesmanId);
    jsonResponse(res, data);
    return true;
  }

  // POST /api/send — send message (for testing)
  if (req.method === 'POST' && pathname === '/api/send') {
    const body = await parseBody(req);
    const { instanceId, to, text } = body;
    if (!instanceId || !to || !text) {
      jsonResponse(res, { error: 'instanceId, to, and text are required' }, 400);
      return true;
    }
    const result = await sendMessage(instanceId, to, text);
    jsonResponse(res, result, result.success ? 200 : 400);
    return true;
  }

  return false;
}

// ─── Main Request Handler ───────────────────────────────────────────────

export async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith('/api/')) {
    const handled = await handleAPI(req, res, pathname);
    if (handled) return;
  }

  // QR binding page
  const qrPageMatch = pathname.match(/^\/qr\/(.+)$/);
  if (qrPageMatch) {
    const instanceId = qrPageMatch[1];
    const instance = getAllInstances().find((i) => i.instanceId === instanceId);
    const name = instance?.name || 'Salesman';
    const html = await renderQRPage(instanceId, name);
    htmlResponse(res, html);
    return;
  }

  // Main dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    htmlResponse(res, renderDashboard());
    return;
  }

  // Health check
  if (pathname === '/health') {
    jsonResponse(res, {
      status: 'ok',
      uptime: process.uptime(),
      salesmenOnline: getAllInstances().filter((i) => i.connected).length,
      salesmenTotal: getAllInstances().length,
    });
    return;
  }

  // 404
  jsonResponse(res, { error: 'Not found' }, 404);
}
