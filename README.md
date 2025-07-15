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

## **Admin rozhraní a správa aplikací**

### **Role a přístupová práva**
- **Superadmin**
  - Vidí a spravuje všechny aplikace.
  - Může přiřazovat adminy k aplikacím.
  - Může upravovat obsah všech aplikací.
  - Může spravovat uživatele (adminy) v UI.
- **Admin**
  - Vidí a spravuje pouze aplikace, které mu byly přiřazeny.
  - Může upravovat obsah, měnit pořadí stránek (nastavit homepage), posílat notifikace uživatelům své aplikace.

### **Správa uživatelů (adminů)**
- Superadmin může v UI:
  - Přidávat nové adminy (vytvořit účet, nastavit roli).
  - Přiřazovat adminy k aplikacím (každá aplikace má právě jednoho admina).
  - Měnit roli uživatele (admin/superadmin).
- Admin nemůže spravovat jiné uživatele.

### **Správa aplikací**
- Superadmin může:
  - Vytvářet nové aplikace.
  - Přiřazovat admina k aplikaci.
  - Upravit obsah libovolné aplikace.
- Admin může:
  - Upravit obsah pouze svých aplikací.
  - Měnit pořadí stránek (drag&drop, tlačítka), nastavit homepage.
  - Posílat notifikace uživatelům své aplikace.

### **Obsah a CMS**
- Obsah aplikací je uložen v cloudu (Firestore).
- Změny obsahu se projeví v reálném čase i v již nasazených aplikacích (pokud aplikace používá online data).
- Aplikace na Google Play si při spuštění stáhne aktuální obsah z cloudu (pokud je online).
- Pokud je aplikace offline, použije poslední stažený obsah nebo assety.

### **Notifikace**
- Admin i superadmin mohou posílat notifikace uživatelům své aplikace.

### **Bezpečnost**
- Práva jsou vynucována jak v UI, tak v backendu (např. Firestore rules).

---

## **Datový model (Firestore)**

### **Kolekce: `users`**
```json
{
  "id": "user_uid",
  "email": "admin@email.cz",
  "role": "superadmin" | "admin"
}
```

### **Kolekce: `apps`**
```json
{
  "id": "app_id",
  "name": "Název aplikace",
  "description": "Popis",
  "menu": [ ... ], // stránky, obsah, obrázky atd.
  "adminId": "user_uid" // UID admina, který spravuje tuto aplikaci
}
```

### **Kolekce: `notifications`**
```json
{
  "id": "notif_id",
  "appId": "app_id",
  "message": "Text notifikace",
  "createdAt": "timestamp"
}
```

---

## **Doporučený postup implementace admin dashboardu**

1. **Autentizace a správa uživatelů**
   - Zprovoznit Firebase Auth.
   - UI pro přihlášení, registraci, změnu hesla.
   - Nastavit role (`superadmin`, `admin`) v kolekci `users`.

2. **Admin dashboard**
   - Po přihlášení zobrazit dashboard podle role:
     - Superadmin: seznam všech aplikací, správa uživatelů.
     - Admin: seznam svých aplikací.

3. **Správa aplikací a přiřazování adminů**
   - Superadmin může přiřadit admina k aplikaci (dropdown v detailu aplikace).
   - Admin vidí jen své aplikace.

4. **Editace obsahu (CMS)**
   - Admin i superadmin mohou upravovat obsah aplikace (stránky, pořadí, homepage).
   - Změny se ukládají do Firestore.

5. **Notifikace**
   - UI pro posílání notifikací uživatelům aplikace.

---

## **Poznámky k CMS a nasazeným aplikacím**
- Pokud mobilní aplikace načítá obsah z Firestore, změny provedené v admin rozhraní se projeví i v již nasazených aplikacích (bez nutnosti update v Google Play).
- Pokud je aplikace offline, použije poslední stažený obsah nebo assety.
- Kód aplikace (funkce, logika) nelze měnit vzdáleně, pouze obsah.

---

## **Bezpečnostní pravidla (příklad pro Firestore)**
```js
match /apps/{appId} {
  allow read, update: if request.auth != null && (
    get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'superadmin' ||
    resource.data.adminId == request.auth.uid
  );
  allow create, delete: if get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
}
```

---

## **Založení prvního superadmina (Firebase Authentication + Firestore)**

Aby bylo možné spravovat aplikace a adminy, je potřeba nejprve ručně založit prvního uživatele s rolí `superadmin`. Tento uživatel bude mít plný přístup ke všem funkcím systému.

### **Postup krok za krokem:**

1. **Aktivace Firebase Authentication**
   - V konzoli Firebase přejdi do sekce **Authentication** a klikni na „Get started“.
   - Povol poskytovatele přihlášení **Email/Password**.

2. **Vytvoření prvního uživatele (superadmina)**
   - V záložce „Users“ klikni na „Add user“.
   - Zadej e-mail a heslo pro superadmina.
   - Po vytvoření uživatele si zkopíruj jeho **UID** (najdeš ho ve sloupci UID v tabulce uživatelů).

3. **Založení kolekce `users` ve Firestore a přidání superadmina**
   - Otevři Firestore Database → „Start collection“ → zadej `users`.
   - Jako **Document ID** zadej **UID** uživatele z předchozího kroku.
   - Přidej pole:
     - `email` (string): e-mail superadmina
     - `role` (string): `superadmin`
   - Ulož dokument.

#### **Příklad zápisu v kolekci `users`:**
- **ID dokumentu:** UID uživatele (např. `abUmos6ACuO9SGPPuU479yf09AJK2`)
- **Obsah dokumentu:**
  ```json
  {
    "email": "superadmin@email.cz",
    "role": "superadmin"
  }
  ```

**Poznámka:**
- UID je unikátní identifikátor uživatele v Auth a zároveň slouží jako ID dokumentu v kolekci `users`.
- Díky tomu je možné jednoduše a bezpečně ověřovat role a práva uživatelů v aplikaci i v bezpečnostních pravidlech Firestore.

---

Pokud bude třeba rozšířit nebo změnit architekturu, lze tuto sekci README dále upravovat. 