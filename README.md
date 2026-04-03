# OverlabtEvents

Minimale event-registratie website gehost op GitHub Pages, met Google Sheets als database en Mollie voor betalingen.

## Features

- **Evenementen** met meerdere tijdsloten en max. aantal inschrijvingen
- **Gratis en betalende events** — betalingen via Mollie
- **Verborgen admin panel** — events, tijdsloten en inschrijvingen beheren
- **Google Sheets als database** — geen server nodig
- **Bevestigingsmail** na inschrijving
- **Swiss design** — zwart-wit, Inter font, minimalistisch

## Architectuur

```
Browser ──► GitHub Pages (statische HTML/CSS/JS)
               │
               ▼
         Google Apps Script (API)
           ├── Google Sheets (data)
           └── Mollie API (betalingen)
```

- **Frontend**: statische site op GitHub Pages
- **Backend**: Google Apps Script als REST API
- **Database**: Google Sheets (3 tabbladen: Events, Tijdslots, Inschrijvingen)
- **Betalingen**: Mollie — aangemaakt via GAS, status gecheckt via timer-trigger

## Bestanden

```
├── index.html        Publieke eventpagina met inschrijfformulier
├── admin.html        Admin panel (wachtwoord-beveiligd)
├── css/style.css     Swiss design stylesheet
├── js/app.js         Publieke logica
├── js/admin.js       Admin logica (wachtwoord als SHA-256 hash)
├── gas/Code.gs       Google Apps Script backend (niet op GitHub Pages)
├── SETUP.md          Stap-voor-stap setup handleiding
└── README.md         Dit bestand
```

## Snel starten

Zie **[SETUP.md](SETUP.md)** voor de volledige setup wizard:

1. Google Sheet aanmaken
2. Google Apps Script deployen
3. Mollie account + API key instellen
4. GitHub Pages activeren
5. Config invullen (`js/app.js` en `js/admin.js`)
6. Testen

## Beveiliging

- Admin wachtwoord wordt als **SHA-256 hash** opgeslagen in de broncode
- Het echte wachtwoord wordt **server-side gevalideerd** in Google Apps Script
- Mollie API key staat veilig in GAS Script Properties (niet in de frontend)

## Licentie

MIT
