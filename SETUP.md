# Setup Wizard — Overlabtentries

Volg deze stappen om de event-registratie website volledig werkend te krijgen.

---

## Stap 1: Google Sheet aanmaken

1. Ga naar [Google Sheets](https://sheets.google.com) en maak een **nieuw spreadsheet** aan.
2. Geef het een naam, bijv. `Overlabtentries`.
3. De tabbladen worden automatisch aangemaakt door het script (zie stap 2), maar als je ze handmatig wilt aanmaken:

**Tabblad "Events"** — kolommen (rij 1):
```
eventId | titel | beschrijving | locatie | isBetalend | prijs | actief
```

**Tabblad "Tijdslots"** — kolommen (rij 1):
```
slotId | eventId | datum | startTijd | eindTijd | maxInschrijvingen
```

**Tabblad "Inschrijvingen"** — kolommen (rij 1):
```
inschrijvingId | slotId | eventId | naam | email | telefoon | aantalPersonen | betaalStatus | molliePaymentId | timestamp
```

---

## Stap 2: Google Apps Script instellen

### 2a. Script aanmaken

1. Open je Google Sheet uit stap 1.
2. Ga naar **Extensies > Apps Script**.
3. Verwijder alle standaardcode in `Code.gs`.
4. Kopieer de volledige inhoud van `gas/Code.gs` uit dit project en plak het in de editor.
5. Klik op **Opslaan** (💾).

### 2b. Sheets automatisch aanmaken

1. Selecteer in het dropdown-menu bovenaan de functie `setupSheets`.
2. Klik op **▶ Uitvoeren**.
3. Geef toestemming wanneer Google hierom vraagt.
4. De drie tabbladen (Events, Tijdslots, Inschrijvingen) worden nu automatisch aangemaakt met de juiste headers.

### 2c. Script Properties instellen

1. Klik links op **⚙️ Projectinstellingen** (tandwiel-icoon).
2. Scroll naar **Scripteigenschappen** en klik op **Scripteigenschap toevoegen**.
3. Voeg de volgende properties toe:

| Property | Waarde | Uitleg |
|---|---|---|
| `ADMIN_PASSWORD` | `jouwGeheimWachtwoord` | Wachtwoord voor de admin pagina |
| `MOLLIE_API_KEY` | `test_xxxxxxxx` of `live_xxxxxxxx` | Je Mollie API key (zie stap 3) |
| `SITE_URL` | `https://jouwgebruiker.github.io/overlabtentries` | URL van je website |

### 2d. Deployen als web-app

1. Klik op **Implementeren > Nieuwe implementatie**.
2. Klik op het tandwiel ⚙️ naast "Type selecteren" en kies **Web-app**.
3. Stel in:
   - **Beschrijving**: `Overlabtentries API`
   - **Uitvoeren als**: `Ik` (je eigen Google-account)
   - **Wie heeft toegang**: `Iedereen`
4. Klik op **Implementeren**.
5. **Kopieer de web-app URL** — deze heb je nodig in stap 5.

> ⚠️ **Let op**: Bij elke wijziging in de code moet je een **nieuwe versie** implementeren. Ga naar Implementeren > Implementaties beheren > ✏️ Bewerken > selecteer "Nieuwe versie" > Implementeren.

### 2e. Mollie betaalstatus trigger instellen

Omdat Google Apps Script geen echte webhooks kan ontvangen, gebruiken we een timer die elke 5 minuten de betaalstatus controleert:

1. Ga in de Apps Script editor naar **⏰ Triggers** (klok-icoon links).
2. Klik op **+ Trigger toevoegen**.
3. Stel in:
   - **Functie**: `checkMolliePayments`
   - **Implementatie**: `Head`
   - **Gebeurtenisbron**: `Op basis van tijd`
   - **Type trigger**: `Minuten-timer`
   - **Interval**: `Elke 5 minuten`
4. Klik op **Opslaan**.

---

## Stap 3: Mollie instellen

### 3a. Account aanmaken

1. Ga naar [Mollie.com](https://www.mollie.com) en maak een account aan.
2. Voltooi de verificatie (KvK-nummer, bankgegevens, etc.).

### 3b. API key ophalen

1. Log in op het [Mollie Dashboard](https://my.mollie.com).
2. Ga naar **Developers > API-sleutels**.
3. Je ziet twee keys:
   - **Test API key** (`test_xxxxxxxx`) — voor ontwikkeling
   - **Live API key** (`live_xxxxxxxx`) — voor echte betalingen
4. Kopieer de gewenste key.

### 3c. API key instellen

Ga terug naar Google Apps Script (stap 2c) en vul de `MOLLIE_API_KEY` in met je gekozen key.

> 💡 **Tip**: Begin met de **test key** om alles te testen. Schakel pas over naar de live key als alles werkt. In test-modus kun je betalingen simuleren via het Mollie dashboard.

---

## Stap 4: GitHub Pages instellen

### 4a. Repository aanmaken

1. Ga naar [GitHub](https://github.com) en maak een nieuwe repository aan:
   - **Naam**: `overlabtentries`
   - **Zichtbaarheid**: Public (vereist voor gratis GitHub Pages)
2. Push de bestanden:

```bash
cd overlabtentries
git init
git add index.html admin.html css/ js/ SETUP.md
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/JOUW_GEBRUIKERSNAAM/overlabtentries.git
git push -u origin main
```

> ⚠️ Push **NIET** de `gas/` map — die code staat in Google Apps Script, niet op je website.

### 4b. GitHub Pages activeren

1. Ga naar je repository op GitHub.
2. Klik op **Settings > Pages**.
3. Bij **Source**: selecteer `Deploy from a branch`.
4. Bij **Branch**: selecteer `main` en `/ (root)`.
5. Klik op **Save**.
6. Na een paar minuten is je site beschikbaar op: `https://JOUW_GEBRUIKERSNAAM.github.io/overlabtentries`

---

## Stap 5: Config invullen in de website

### 5a. Publieke website (`js/app.js`)

Open `js/app.js` en pas het CONFIG-object aan (regels 5-10):

```javascript
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/JOUW_DEPLOYMENT_ID/exec',
  SITE_URL: 'https://JOUW_GEBRUIKERSNAAM.github.io/overlabtentries',
};
```

### 5b. Admin pagina (`js/admin.js`)

Open `js/admin.js` en pas het CONFIG-object aan (regels 5-11):

```javascript
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/JOUW_DEPLOYMENT_ID/exec',
  ADMIN_PASSWORD_HASH: 'jouw_sha256_hash',
};
```

**Hash genereren**: open je browser console (F12) en voer uit:

```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('jouwWachtwoord'))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
```

Kopieer het resultaat en plak het als waarde van `ADMIN_PASSWORD_HASH`.

> ⚠️ Het wachtwoord waarmee je de hash genereert moet **exact hetzelfde** zijn als de `ADMIN_PASSWORD` in de Script Properties (stap 2c). De hash staat veilig in de broncode — het wachtwoord zelf is niet te achterhalen.

### 5c. Push de wijzigingen

```bash
git add js/app.js js/admin.js
git commit -m "Config ingevuld"
git push
```

---

## Stap 6: Testen

### Checklist

- [ ] Open je website: `https://JOUW_GEBRUIKERSNAAM.github.io/overlabtentries`
- [ ] Je ziet "Er zijn momenteel geen evenementen gepland." (dat klopt!)
- [ ] Open de admin: `https://JOUW_GEBRUIKERSNAAM.github.io/overlabtentries/admin.html`
- [ ] Log in met je admin wachtwoord
- [ ] Maak een test-event aan (gratis)
- [ ] Voeg een tijdslot toe
- [ ] Ga terug naar de publieke site en schrijf je in
- [ ] Maak een betalend test-event aan (met test API key)
- [ ] Test de betaalflow met Mollie (in test-modus)
- [ ] Controleer of de inschrijvingen verschijnen in je Google Sheet

---

## Veelgestelde vragen

**Q: Ik krijg een CORS-fout in de browser.**
A: Controleer of je de web-app hebt gedeployed met "Wie heeft toegang: Iedereen". Na elke code-wijziging moet je een **nieuwe versie** deployen.

**Q: De admin pagina laadt events maar er verschijnt niets.**
A: Controleer of de `ADMIN_PASSWORD_HASH` in `js/admin.js` is gegenereerd met exact hetzelfde wachtwoord als de `ADMIN_PASSWORD` in Script Properties.

**Q: Mollie betalingen komen niet door.**
A: Controleer of de `checkMolliePayments` trigger actief is (stap 2e). Controleer ook of je de juiste API key gebruikt (test vs live).

**Q: Ik wil de site URL of naam aanpassen.**
A: Pas de `SITE_URL` aan in zowel `js/app.js`, Script Properties, als de `SITE_URL` property in Apps Script.

**Q: Kan ik een eigen domein gebruiken?**
A: Ja! Volg de [GitHub Pages custom domain instructies](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) en pas alle SITE_URL configuraties aan.
