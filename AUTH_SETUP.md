# Nastavení autentizace pro Flutter App Generator

## 1. Firebase Authentication Setup

### Povolení Email/Password autentizace
1. Jděte do Firebase Console → Authentication → Sign-in method
2. Povolte "Email/Password" provider
3. Zkontrolujte, že je povoleno "Allow users to sign up"

### Nastavení Firestore Rules
1. Zkopírujte obsah souboru `firestore.rules` do Firebase Console → Firestore → Rules
2. Deployujte pravidla

## 2. Vytvoření prvního Superadmina

### Metoda 1: Přes Firebase Console
1. Jděte do Firebase Console → Authentication → Users
2. Klikněte "Add user"
3. Zadejte email a heslo pro superadmina
4. Vytvořte dokument v kolekci `users` s tímto obsahem:
```json
{
  "email": "superadmin@example.com",
  "role": "superadmin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Metoda 2: Přes aplikaci (doporučeno)
1. Spusťte aplikaci: `npm run dev`
2. Otevřete http://localhost:3000
3. Přihlaste se s libovolným emailem a heslem (první uživatel se automaticky stane superadminem)
4. Nebo použijte registrační formulář v superadmin dashboardu

## 3. Testování autentizace

### Vytvoření testovacích uživatelů
1. Přihlaste se jako superadmin
2. V dashboardu klikněte "Přidat uživatele"
3. Vytvořte několik admin uživatelů
4. Otestujte přihlášení s různými rolemi

### Testování rolí
- **Superadmin**: Vidí všechny aplikace a uživatele, může přiřazovat adminy
- **Admin**: Vidí pouze své přiřazené aplikace

## 4. Bezpečnostní poznámky

### Firestore Rules
- Pravidla jsou nastavena tak, aby admini viděli pouze své aplikace
- Superadmin má plný přístup ke všemu
- Uživatelé mohou číst pouze svůj vlastní profil

### Doporučení
- Používejte silná hesla
- Pravidelně kontrolujte seznam uživatelů
- Zálohujte Firestore data
- Monitorujte Firebase Authentication logs

## 5. Troubleshooting

### Problém: Uživatel se nemůže přihlásit
- Zkontrolujte, že je povolena Email/Password autentizace
- Ověřte, že uživatel existuje v kolekci `users`
- Zkontrolujte Firestore rules

### Problém: Admin nevidí aplikace
- Zkontrolujte, že je aplikace přiřazena správnému adminovi
- Ověřte, že `adminId` v dokumentu aplikace odpovídá UID admina

### Problém: Chyby v konzoli
- Zkontrolujte Firebase konfiguraci v `app/lib/firebase.ts`
- Ověřte, že jsou správně nastaveny environment variables

## 6. Další kroky

Po úspěšném nastavení autentizace můžete:
1. Vytvořit první aplikace v superadmin dashboardu
2. Přiřadit aplikace adminům
3. Implementovat editor obsahu pro adminy
4. Přidat notifikační systém
5. Implementovat CMS funkcionalitu 