# Așii Cerului  
## Aviația în Primul Război Mondial

**Așii Cerului** este o aplicație web interactivă care prezintă evoluția aviației în Primul Război Mondial printr-un sistem modular bazat pe conținut încărcat dinamic. Proiectul utilizează HTML, CSS și JavaScript (vanilla) și include parsare automată a secțiunilor, timeline, carduri pentru piloți și aeronave, sistem avansat de note și navigare inteligentă între secțiuni.

🔗 https://klipperboi.github.io/asii-cerului

---

# Features

## Conținut

- încărcare dinamică din `text.txt`
- structură modulară (`=== SECȚIUNE ===`)
- subsecțiuni și blocuri dedicate (PILOT / AIRCRAFT / TIMELINE)
- sistem note cu sintaxă `[[nr|text]]`
- secțiuni: cronologie, bătălii, România, așii, propagandă, avioane, moștenire

## UI / UX

- meniu lateral cu highlight automat
- hash navigation (#secțiune)
- salvare și restaurare poziție scroll per secțiune
- revenire automată la ultima secțiune vizitată
- buton contextual „Înapoi” din secțiunea Resurse
- animații subtile la schimbare secțiune
- slideshow imagini cu autoplay

## Sistem Note

- tooltip la hover (desktop)
- suport tap/click (mobil)
- scroll automat către notă în „Resurse”
- highlight temporar notă selectată
- revenire rapidă la secțiunea anterioară

## Carduri Dinamice

- randare automată piloți
- randare automată aeronave
- layout responsive dual-column
- parsare multi-paragraf pentru descrieri

---

# Changelog

## 2.0.0 — Sistem Note & Navigare Contextuală

- refactor complet tooltip
- jump automat către „Resurse”
- highlight notă selectată
- implementare buton „Înapoi”
- corectare dublu-highlight (ex: Fokker[[33|Fokker]])

## 1.8.0 — Scroll Persistence

- salvare poziție scroll per secțiune
- restaurare automată la refresh
- memorare ultima secțiune vizitată

## 1.6.0 — Carduri Dinamice

- implementare parser `--- PILOT ---`
- implementare parser `--- AIRCRAFT ---`
- layout dedicat pentru afișare

## 1.4.0 — Timeline

- sistem `--- TIMELINE ---`
- parsare automată ani și etichete

## 1.0.0 — Prima versiune stabilă

- structură multi-secțiune
- încărcare dinamică text
- meniu lateral funcțional
- design istoric coerent
