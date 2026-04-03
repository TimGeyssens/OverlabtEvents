/* ============================================
   Overlabtentries — Public App
   ============================================ */

const CONFIG = {
  // === VUL DEZE IN NA SETUP ===
  GAS_URL: 'JOUW_GOOGLE_APPS_SCRIPT_WEB_APP_URL',
  // URL van je website (GitHub Pages)
  SITE_URL: 'https://JOUW_GEBRUIKERSNAAM.github.io/overlabtentries',
};

const App = {
  events: [],
  currentEvent: null,
  currentSlots: [],

  // ── Initialization ──────────────────────────

  init() {
    this.checkPaymentReturn();
    this.loadEvents();
  },

  // ── API Calls ───────────────────────────────

  async api(action, params = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
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
      body: JSON.stringify({ action, ...body }),
    });
    if (!res.ok) throw new Error('Netwerkfout');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ── Load Events ─────────────────────────────

  async loadEvents() {
    const loading = document.getElementById('events-loading');
    const error = document.getElementById('events-error');
    const empty = document.getElementById('events-empty');
    const grid = document.getElementById('events-grid');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    empty.classList.add('hidden');
    grid.innerHTML = '';

    try {
      const data = await this.api('getEvents');
      this.events = data.events || [];
      loading.classList.add('hidden');

      if (this.events.length === 0) {
        empty.classList.remove('hidden');
        return;
      }

      grid.innerHTML = this.events.map(ev => this.renderEventCard(ev)).join('');
    } catch (err) {
      loading.classList.add('hidden');
      error.textContent = 'Kon evenementen niet laden. Probeer later opnieuw.';
      error.classList.remove('hidden');
    }
  },

  renderEventCard(ev) {
    const badgeClass = ev.isBetalend ? 'badge-paid' : 'badge-free';
    const badgeText = ev.isBetalend ? `€${Number(ev.prijs).toFixed(2)}` : 'Gratis';
    return `
      <div class="card" onclick="App.showEventDetail('${ev.eventId}')">
        <h3>${this.esc(ev.titel)}</h3>
        <div class="card-meta">
          <span>${this.esc(ev.locatie || '')}</span>
        </div>
        <div class="card-body">
          <p>${this.esc(ev.beschrijving || '')}</p>
        </div>
        <div class="card-footer">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span class="btn btn-small btn-outline">Bekijk &rarr;</span>
        </div>
      </div>
    `;
  },

  // ── Event Detail ────────────────────────────

  async showEventDetail(eventId) {
    const ev = this.events.find(e => e.eventId === eventId);
    if (!ev) return;
    this.currentEvent = ev;

    document.getElementById('detail-title').textContent = ev.titel;
    document.getElementById('detail-description').textContent = ev.beschrijving || '';
    document.getElementById('detail-location').textContent = ev.locatie ? `📍 ${ev.locatie}` : '';
    document.getElementById('detail-price').innerHTML = ev.isBetalend
      ? `<span class="badge badge-paid">€${Number(ev.prijs).toFixed(2)} per persoon</span>`
      : '<span class="badge badge-free">Gratis</span>';

    this.showView('view-detail');

    // Load slots
    const loading = document.getElementById('detail-slots-loading');
    const table = document.getElementById('detail-slots');
    const tbody = document.getElementById('detail-slots-body');

    loading.classList.remove('hidden');
    table.classList.add('hidden');
    tbody.innerHTML = '';

    try {
      const data = await this.api('getSlots', { eventId });
      this.currentSlots = data.slots || [];
      loading.classList.add('hidden');

      if (this.currentSlots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Geen tijdsloten beschikbaar.</td></tr>';
      } else {
        tbody.innerHTML = this.currentSlots.map(slot => this.renderSlotRow(slot)).join('');
      }
      table.classList.remove('hidden');
    } catch (err) {
      loading.classList.add('hidden');
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Kon tijdsloten niet laden.</td></tr>';
      table.classList.remove('hidden');
    }
  },

  renderSlotRow(slot) {
    const beschikbaar = slot.maxInschrijvingen - slot.huidigeInschrijvingen;
    const isFull = beschikbaar <= 0;
    const statusClass = isFull ? 'slot-full' : 'slot-available';
    const statusText = isFull ? 'Volzet' : `${beschikbaar} plaats${beschikbaar === 1 ? '' : 'en'}`;

    return `
      <tr>
        <td>${this.esc(slot.datum)}</td>
        <td>${this.esc(slot.startTijd)}–${this.esc(slot.eindTijd)}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>
          ${isFull
            ? '<span class="badge badge-full">Volzet</span>'
            : `<button class="btn btn-small" onclick="App.openRegistration('${slot.slotId}')">Inschrijven</button>`
          }
        </td>
      </tr>
    `;
  },

  // ── Registration ────────────────────────────

  openRegistration(slotId) {
    const slot = this.currentSlots.find(s => s.slotId === slotId);
    if (!slot) return;

    document.getElementById('reg-event-id').value = this.currentEvent.eventId;
    document.getElementById('reg-slot-id').value = slotId;
    document.getElementById('register-slot-info').textContent =
      `${this.currentEvent.titel} — ${slot.datum} ${slot.startTijd}–${slot.eindTijd}`;

    // Show correct button
    const isBetalend = this.currentEvent.isBetalend;
    document.getElementById('register-btn').classList.toggle('hidden', isBetalend);
    document.getElementById('register-pay-btn').classList.toggle('hidden', !isBetalend);

    // Reset form
    document.getElementById('register-form').reset();
    document.getElementById('reg-aantal').value = '1';
    document.getElementById('register-error').classList.add('hidden');

    // Open modal
    document.getElementById('modal-register').classList.add('active');
  },

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modal-register').classList.remove('active');
  },

  async submitRegistration(e) {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    errorEl.classList.add('hidden');

    const btn = this.currentEvent.isBetalend
      ? document.getElementById('register-pay-btn')
      : document.getElementById('register-btn');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Bezig...';

    const payload = {
      eventId: document.getElementById('reg-event-id').value,
      slotId: document.getElementById('reg-slot-id').value,
      naam: document.getElementById('reg-naam').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      telefoon: document.getElementById('reg-telefoon').value.trim(),
      aantalPersonen: parseInt(document.getElementById('reg-aantal').value, 10),
      returnUrl: CONFIG.SITE_URL + '?betaling=succes',
    };

    try {
      const result = await this.apiPost('register', payload);

      this.closeModal();

      if (result.paymentUrl) {
        // Redirect to Mollie
        this.showView('view-payment-pending');
        window.location.href = result.paymentUrl;
      } else {
        // Free event — show confirmation
        document.getElementById('confirmation-message').textContent =
          'Je inschrijving is bevestigd. Je ontvangt een bevestiging per e-mail.';
        this.showView('view-confirmation');
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Er ging iets mis. Probeer opnieuw.';
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  },

  // ── Payment Return ──────────────────────────

  checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('betaling') === 'succes') {
      document.getElementById('confirmation-message').textContent =
        'Je betaling is ontvangen en je inschrijving is bevestigd!';
      this.showView('view-confirmation');
      // Clean URL
      history.replaceState({}, '', window.location.pathname);
    }
  },

  // ── View Management ─────────────────────────

  showView(viewId) {
    document.querySelectorAll('main').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0, 0);
  },

  showEvents() {
    this.showView('view-events');
    this.loadEvents();
  },

  // ── Utilities ───────────────────────────────

  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
