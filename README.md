# Dokumentace projektu: Flutter App Generator s Firebase

## Účel projektu
Cílem projektu je vytvořit generátor mobilních aplikací (primárně pro Android, s možností rozšíření na iOS), který umožní uživateli jednoduše sestavit vlastní aplikaci přes webové rozhraní. Výsledná aplikace je generována na základě zadané konfigurace, obsahuje integraci s Firebase (Firestore, Storage, případně Auth) a podporuje offline režim s fallbackem na assety.

## Architektura a stavba projektu

### Hlavní části:
- **Frontend (Editor/Generátor):**
  - Webové rozhraní pro zadávání obsahu, stránek, nastavení a generování aplikací.
  - Umožňuje správu více aplikací, editaci obsahu, generování APK.
  - Role-based UI (superadmin/admin).

- **Backend (Node.js server):**
  - Přijímá konfiguraci z editoru, generuje build složku na základě šablony.
  - Zajišťuje úpravu šablony (Flutter) podle zadaných parametrů (název, packageName, stránky, obrázky, atd.).
  - Kopíruje správný `google-services.json` podle packageName.
  - Spouští build Flutter aplikace a ukládá výsledné APK do složky `downloads`.

- **Šablona Flutter aplikace:**
  - Základní struktura aplikace s podporou dynamického obsahu (stránky, webview, obrázky, atd.).
  - Integrace s Firebase (Firestore, Storage, Auth).
  - Podpora offline režimu (data z assetů).
  - Dynamická navigace, dlaždicové menu, spodní lišta.

- **Firebase projekt:**
  - Každá generovaná aplikace má vlastní Firebase Android App (unikátní packageName).
  - Správné `google-services.json` pro každou aplikaci.

---

## Popis aktuálního stavu a dosažených milníků

### Dosažené funkce:
- [x] **Plně funkční generátor APK** na základě webového rozhraní a šablony.
- [x] **Automatická úprava packageName, názvu aplikace, build.gradle, AndroidManifest, MainActivity.**
- [x] **Správné kopírování a párování `google-services.json` podle packageName.**
- [x] **Podpora více aplikací s různými packageName a vlastní Firebase konfigurací.**
- [x] **Základní šablona Flutter aplikace s dynamickým načítáním obsahu (stránky, obrázky, webview, atd.).**
- [x] **WebView stránka je nyní fullscreen bez nadpisu a bez zobrazení URL.**
- [x] **Spodní navigační lišta se třemi tlačítky (Zpět, Domů, Menu).**
- [x] **Celostránkové dlaždicové menu s dynamickým počtem dlaždic podle stránek.**
- [x] **Instalace a spuštění vygenerované aplikace na reálném zařízení.**
- [x] **Role-based UI v editoru (superadmin/admin).**
- [x] **Podpora offline režimu s fallbackem na assety.**

### Další plánované kroky:
- [ ] Vylepšení vzhledu dlaždicového menu (ikony, barvy, animace).
- [ ] Možnost přidávat vlastní ikony/obrázky ke stránkám v menu.
- [ ] Rozšíření editoru o další typy stránek (formuláře, seznamy, atd.).
- [ ] Podpora iOS buildů.
- [ ] Automatizace uploadu APK na Google Play (volitelně).
- [ ] Detailnější logování a monitoring generátoru.
- [ ] Lokalizace aplikace a editoru.

---

## Zápis dokončených úkolů (milníky)
*(Tuto sekci budeme průběžně doplňovat po každém větším dokončeném kroku)*

- **27. 6. 2025** – Úspěšně vygenerována a nainstalována aplikace s fullscreen WebView.
- **28. 6. 2025** – Implementována spodní lišta a celostránkové dlaždicové menu, vše funkční na reálném zařízení.

---

## Poznámky a doporučení
- Při každé větší změně šablony nebo generátoru doporučuji restartovat backend (`npm run dev`).
- Při generování nové aplikace vždy smažte staré APK soubory, aby nedošlo k záměně.
- Pro přidání nové funkce nejprve upravte šablonu Flutter, poté generátor a nakonec editor.

---

Pokud budete chtít dokument rozšířit, stačí mi napsat, co přidat nebo upravit! 
Mohu jej také kdykoliv aktualizovat podle aktuálního stavu projektu. 