/* ============================================
   Overlabtentries — Admin Panel
   ============================================ */

const CONFIG = {
  // === VUL DEZE IN NA SETUP ===
  GAS_URL: 'JOUW_GOOGLE_APPS_SCRIPT_WEB_APP_URL',
  // SHA-256 hash van je admin wachtwoord.
  // Genereer via browser console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('jouwWachtwoord')).then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
  ADMIN_PASSWORD_HASH: 'VUL_HIER_JE_SHA256_HASH_IN',
};

const Admin = {
  events: [],
  currentEventId: null,
  slots: [],

  // ── Authentication ──────────────────────────

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async login(e) {
    e.preventDefault();
    const pass = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error');

    const hash = await this.hashPassword(pass);
    if (hash === CONFIG.ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem('admin', 'true');
      sessionStorage.setItem('adminKey', pass);
      document.getElementById('view-login').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      this.loadEvents();
    } else {
      errorEl.textContent = 'Onjuist wachtwoord.';
      errorEl.classList.remove('hidden');
    }
  },

  getAdminKey() {
    return sessionStorage.getItem('adminKey') || '';
  },

  init() {
    if (sessionStorage.getItem('admin') === 'true' && sessionStorage.getItem('adminKey')) {
      document.getElementById('view-login').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      this.loadEvents();
    }
  },

  // ── API Calls ───────────────────────────────

  async api(action, params = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('adminKey', this.getAdminKey());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Netwerkfout');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  async apiPost(action, body = {}) {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, adminKey: this.getAdminKey(), ...body }),
    });
    if (!res.ok) throw new Error('Netwerkfout');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ── Messages ────────────────────────────────

  showMessage(text, type = 'success') {
    const el = document.getElementById('admin-message');
    el.className = `message message-${type}`;
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  },

  // ── Events ──────────────────────────────────

  async loadEvents() {
    const loading = document.getElementById('admin-events-loading');
    const list = document.getElementById('admin-events-list');
    loading.classList.remove('hidden');
    list.innerHTML = '';

    try {
      const data = await this.api('getEvents', { includeInactive: 'true' });
      this.events = data.events || [];
      loading.classList.add('hidden');

      if (this.events.length === 0) {
        list.innerHTML = '<p class="text-muted">Nog geen evenementen.</p>';
        return;
      }

      list.innerHTML = this.events.map(ev => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 0;border-bottom:1px solid var(--gray-200);">
          <div>
            <strong>${this.esc(ev.titel)}</strong>
            <span class="text-small text-muted" style="margin-left:1rem;">
              ${ev.isBetalend ? '€' + Number(ev.prijs).toFixed(2) : 'Gratis'}
            </span>
            ${!ev.actief ? '<span class="badge" style="margin-left:0.5rem;color:var(--gray-400)">Inactief</span>' : ''}
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-small btn-outline" onclick="Admin.viewEvent('${ev.eventId}')">Beheer</button>
            <button class="btn btn-small" onclick="Admin.toggleEvent('${ev.eventId}', ${!ev.actief})">
              ${ev.actief ? 'Deactiveer' : 'Activeer'}
            </button>
            <button class="btn btn-small" style="border-color:var(--error);color:var(--error);background:var(--white);" onclick="Admin.deleteEvent('${ev.eventId}')">Verwijder</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      loading.classList.add('hidden');
      this.showMessage('Kon events niet laden: ' + err.message, 'error');
    }
  },

  async createEvent(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Bezig...';

    try {
      await this.apiPost('createEvent', {
        titel: document.getElementById('ev-titel').value.trim(),
        beschrijving: document.getElementById('ev-beschrijving').value.trim(),
        locatie: document.getElementById('ev-locatie').value.trim(),
        isBetalend: document.getElementById('ev-betalend').checked,
        prijs: parseFloat(document.getElementById('ev-prijs').value) || 0,
      });

      document.getElementById('form-create-event').reset();
      document.getElementById('ev-prijs-wrap').classList.add('hidden');
      this.showMessage('Evenement aangemaakt!');
      this.loadEvents();
    } catch (err) {
      this.showMessage('Fout: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Event aanmaken';
    }
  },

  async toggleEvent(eventId, activate) {
    try {
      await this.apiPost('toggleEvent', { eventId, actief: activate });
      this.showMessage(activate ? 'Event geactiveerd.' : 'Event gedeactiveerd.');
      this.loadEvents();
    } catch (err) {
      this.showMessage('Fout: ' + err.message, 'error');
    }
  },

  async deleteEvent(eventId) {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen? Dit verwijdert ook alle tijdsloten en inschrijvingen.')) return;
    try {
      await this.apiPost('deleteEvent', { eventId });
      this.showMessage('Event verwijderd.');
      document.getElementById('admin-event-detail').classList.add('hidden');
      this.loadEvents();
    } catch (err) {
      this.showMessage('Fout: ' + err.message, 'error');
    }
  },

  // ── Event Detail (Slots + Registrations) ────

  async viewEvent(eventId) {
    this.currentEventId = eventId;
    const ev = this.events.find(e => e.eventId === eventId);
    if (!ev) return;

    document.getElementById('admin-detail-title').textContent = ev.titel;
    document.getElementById('slot-event-id').value = eventId;
    document.getElementById('admin-event-detail').classList.remove('hidden');

    await Promise.all([
      this.loadSlots(eventId),
      this.loadRegistrations(eventId),
    ]);

    document.getElementById('admin-event-detail').scrollIntoView({ behavior: 'smooth' });
  },

  async loadSlots(eventId) {
    const tbody = document.getElementById('admin-slots-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Laden...</td></tr>';

    try {
      const data = await this.api('getSlots', { eventId });
      this.slots = data.slots || [];

      if (this.slots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Geen tijdsloten.</td></tr>';
        return;
      }

      tbody.innerHTML = this.slots.map(s => `
        <tr>
          <td>${this.esc(s.datum)}</td>
          <td>${this.esc(s.startTijd)}–${this.esc(s.eindTijd)}</td>
          <td>${s.maxInschrijvingen}</td>
          <td>${s.huidigeInschrijvingen}</td>
          <td>
            <button class="btn btn-small" style="border-color:var(--error);color:var(--error);background:var(--white);"
              onclick="Admin.deleteSlot('${s.slotId}')">×</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Fout bij laden.</td></tr>';
    }
  },

  async addSlot(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;

    try {
      await this.apiPost('addSlot', {
        eventId: document.getElementById('slot-event-id').value,
        datum: document.getElementById('slot-datum').value,
        startTijd: document.getElementById('slot-start').value,
        eindTijd: document.getElementById('slot-eind').value,
        maxInschrijvingen: parseInt(document.getElementById('slot-max').value, 10),
      });

      this.showMessage('Tijdslot toegevoegd!');
      this.loadSlots(this.currentEventId);
    } catch (err) {
      this.showMessage('Fout: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  },

  async deleteSlot(slotId) {
    if (!confirm('Tijdslot verwijderen?')) return;
    try {
      await this.apiPost('deleteSlot', { slotId });
      this.showMessage('Tijdslot verwijderd.');
      this.loadSlots(this.currentEventId);
    } catch (err) {
      this.showMessage('Fout: ' + err.message, 'error');
    }
  },

  // ── Registrations ───────────────────────────

  async loadRegistrations(eventId) {
    const tbody = document.getElementById('admin-registrations-body');
    tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Laden...</td></tr>';

    try {
      const data = await this.api('getRegistrations', { eventId });
      const regs = data.registrations || [];

      if (regs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Geen inschrijvingen.</td></tr>';
        return;
      }

      tbody.innerHTML = regs.map(r => {
        const slot = this.slots.find(s => s.slotId === r.slotId);
        const slotInfo = slot ? `${slot.datum} ${slot.startTijd}` : r.slotId;
        const betaalClass = r.betaalStatus === 'betaald' ? 'slot-available' : (r.betaalStatus === 'open' ? 'text-accent' : '');
        return `
          <tr>
            <td>${this.esc(r.naam)}</td>
            <td>${this.esc(r.email)}</td>
            <td>${this.esc(r.telefoon || '—')}</td>
            <td>${r.aantalPersonen}</td>
            <td class="text-small">${this.esc(slotInfo)}</td>
            <td class="${betaalClass}">${this.esc(r.betaalStatus || 'n.v.t.')}</td>
            <td class="text-small">${this.esc(r.timestamp || '')}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Fout bij laden.</td></tr>';
    }
  },

  // ── Navigation ──────────────────────────────

  showSection(section) {
    if (section === 'events') {
      document.getElementById('admin-event-detail').classList.add('hidden');
      this.loadEvents();
    }
  },

  // ── Utilities ───────────────────────────────

  esc(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => Admin.init());
