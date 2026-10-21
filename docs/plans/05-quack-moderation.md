# Plán — 05 Moderace: admin smaže jakýkoli quack

Story: [../user-stories/05-quack-moderation.md](../user-stories/05-quack-moderation.md)

## 1. Jak je to dnes

| Vrstva                        | Co dělá                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `QuacksController.delete`     | `DELETE /api/quacks/:quackId`, `@User()` ze session, 204 / 401 / 403 / 404.                                                          |
| `QuacksService.deleteQuack`   | `getAuthorId` → 404 když chybí, **403 když `authorId !== user.id` — admina výslovně taky**.                                          |
| `QuackRepository.deleteQuack` | `deleteMany({ where: { id: quackId, userId } })` — maže jen řádek, kde `userId` sedí. Pro admina s jeho vlastním id by nesmazal nic. |
| `QuackList`                   | `onDelete` jen když `quack.userId === currentUserId`.                                                                                |
| `DeleteQuackButton`           | Dialog „Delete this quack?“.                                                                                                         |

Role už je k dispozici na obou stranách, nic se nepřidává:

- **Backend:** BetterAuth má `role` v `additionalFields` s `input: false` (při registraci si ji nikdo nenastaví) → `request.session.user.role` → `Identity.role` přes `@User()`.
- **Frontend:** `authSessionQueryOptions` mapuje `role` do `SessionUser.role`, route ho má přes `useSession()`.

Žádná změna schématu ani migrace.

## 2. Backend

### Service — jediné místo, kde se rozhoduje

```ts
// Only the author or an admin may delete a quack.
async deleteQuack(user: Identity, quackId: string): Promise<void> {
  const authorId = await this.quackRepository.getAuthorId(quackId);
  if (!authorId) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);

  const isOwner = authorId === user.id;
  const isAdmin = user.role === UserRole.admin;
  if (!isOwner && !isAdmin) throw new ForbiddenException(NOT_YOUR_QUACK_MESSAGE);

  const deleted = await this.quackRepository.deleteQuack({ quackId, userId: authorId });
  if (!deleted) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
}
```

- `UserRole` z vygenerovaného Prisma klienta, ne řetězec `'admin'` napsaný ručně — překlep by pak chytil type-check.
- Admin se pozná **jen podle `role` ze session**. Jméno ani e-mail se nikde nečtou (Pond Admin je `user`).
- `NOT_YOUR_QUACK_MESSAGE` zůstává („You can only delete your own quacks“) — pro běžného uživatele pořád platí.

### Repository — rozhodnutí: posílat `authorId`, ne `user.id`

Service do `deleteQuack` pošle **autora, kterého si právě načetla**, místo id přihlášeného. Pro autora je to totéž id, pro admina je to id autora, takže `deleteMany({ id, userId })` quack najde.

- Repository se **nemění**, jen komentář: dnes tvrdí, že „no other code path can delete someone else's quack“. To po této změně záměrně neplatí — oprávnění rozhoduje service, repository jen hlídá, že quack mezitím nezmizel (`count === 0` → 404, jako dnes).
- `getAuthorId` + `deleteMany` nejsou v transakci; autor quacku se nikdy nemění, takže mezi nimi nemůže nikdo „podstrčit“ jiného autora. Jediný souběh je smazání mezitím — to už ošetřené je.

Zamítnuto:

- **`userId` v repository volitelné** (bez něj smaž cokoli) — jedno zapomenuté pole a maže se bez podmínky.
- **Samostatná `deleteQuackAsAdmin(quackId)`** — dvě metody na totéž, a service by stejně musela větvit.
- **`RolesGuard` / `@Roles('admin')` na endpointu** — endpoint je pro autora _i_ admina, guard umí jen „tahle role ano / ne“. Rozhodnutí „vlastník, nebo admin“ potřebuje autora z DB, takže patří do service. (Guard v repu ani není.)

### Swagger

- `summary`: „Delete a quack — your own, or anyone's as an admin“.
- `403`: „Someone else wrote this quack and you are not an admin“.

### Unit testy (`quacks.service.spec.ts`)

Fixtures podle seedu: `superadmin = { id: 'u0', role: 'admin' }`, `pondAdmin = { id: 'u6', role: 'user' }`, ostatní dostanou `role: 'user'`.

- **Nahradit** „refuses even an admin who is not the author“ — dnes používá `pondAdmin` s `role: 'admin'`, což neodpovídá seedu.
- Nové: admin smaže quack CaffeinatedDucka → `deleteQuack` volaný s `{ quackId: 'q-espresso', userId: 'u1' }` (autor, ne admin).
- Nové: Pond Admin (`role: 'user'`) → `ForbiddenException`, `deleteQuack` nevolaný.
- Nové: admin + neexistující quack → `NotFoundException`.
- Zůstává: autor smaže svůj; BreadCritic → 403; smazáno mezitím → 404.

`quack.repository.spec.ts` beze změny (repository se nemění), jen přejmenovat test „reports false when nothing matched, e.g. someone else's quack“ — ten případ už service do repository nepustí; nově „…e.g. deleted in the meantime“.

## 3. Frontend

### `lib/canDeleteQuack.ts` (nový, čistá funkce + test)

```ts
export function canDeleteQuack(
  quack: Quack,
  currentUserId?: string,
  isAdmin = false,
): boolean;
```

`true` pro admina vždy, jinak jen u vlastního quacku; bez přihlášeného nikdy. Podle CLAUDE.md patří rozhodovací logika do `lib/` s vlastním testem — dnes je ta podmínka inline v `QuackList`.

### Route `routes/_ProtectedPages/quacks.tsx`

Přibude jen `isAdmin={user?.role === "admin"}` do `QuackList`. Záložka Mine dál filtruje přes `quacksByAuthor(quacks, user.id)` — adminovi tak ukazuje jen jeho quacky, beze změny.

### `QuackList.tsx`

- Nový prop `isAdmin?: boolean` vedle `currentUserId`.
- `onDelete` u položky podle `canDeleteQuack(quack, currentUserId, isAdmin)`.
- `QuackItem` dostane navíc `isOwn={quack.userId === currentUserId}`.

### `QuackItem.tsx` + `DeleteQuackButton.tsx` — dialog se jménem autora

- `DeleteQuackButton` dostane volitelný prop `authorUsername?: string`.
  - bez něj: „Delete this quack?“ (jako dnes)
  - s ním: „Delete @CaffeinatedDuck's quack?“
- `QuackItem` ho předá jen když `!isOwn`. Popis dialogu („It disappears from the feed for everyone…“) i tlačítka zůstávají.
- Žádné nové styly, `aria-label="Delete quack"` beze změny.

`useDeleteQuack` (toast, invalidace) se nemění — chování po úspěchu i chybě je stejné jako u autora.

### Testy

- `canDeleteQuack.test.ts`: vlastní / cizí / admin cizí / nepřihlášený.
- `QuackList.test.tsx`: admin má koš u cizího quacku a klik volá `onDelete` s jeho id; stávající „offers delete on the viewer's own quacks only“ zůstává pro běžného uživatele.
- `QuackItem.test.tsx`: cizí quack s `onDelete` → dialog „Delete @CaffeinatedDuck's quack?“; vlastní → „Delete this quack?“.

## 4. E2E test

### Setup

- `@playwright/test` jako devDependency **frontendu**, testy v `apps/frontend/e2e/` (Vitest ji už má v `exclude`, ESLint ani `tsc` ji neberou, protože se dívají jen do `src/`).
- `apps/frontend/playwright.config.ts`: `testDir: "e2e"`, `baseURL: "http://localhost:3050"`, jen Chromium, **bez `webServer`** — appka už běží (CLAUDE.md: nespouštět druhou instanci).
- Skripty: `"e2e": "playwright test"` ve frontendu, `"e2e": "pnpm frontend e2e"` v rootu. Do `check-all` ani CI se **nepřidává** (story: jen lokálně).
- Jednorázově `pnpm frontend exec playwright install chromium` (stáhne prohlížeč, ~150 MB). Do README krátká poznámka.
- `test-results/` a `playwright-report/` do `.gitignore`.

### `e2e/moderation.e2e.ts`

Helper `signIn(page, email, password)`: `/login` → vyplnit Email a Password podle labelů → „Sign in“ → počkat na `/quacks`. Každý uživatel má vlastní stránku přes `browser.newPage()` (= vlastní kontext a cookies); `/login` přihlášeného rovnou přesměruje, takže jedna stránka = jeden uživatel. API `http://localhost:4050/api`; `page.request` posílá cookies své stránky.

1. **„admin can delete someone else's quack“**
   CaffeinatedDuck pošle `POST /quacks` s `Spam ${Date.now()}` → admin otevře `/quacks`, najde `article` s tím textem, klikne „Delete quack“, ověří nadpis dialogu **„Delete @CaffeinatedDuck's quack?“**, potvrdí „Delete“ → `article` zmizí. Pak `reload()` a znovu nic — smazáno na serveru, ne jen v cache.
2. **„nobody can delete someone else's quack“**
   CaffeinatedDuck vytvoří quack → DeepDuckThoughts pošle `DELETE /quacks/:id` přes `page.request` → **403**; ve feedu DeepDuckThoughtse koš u toho quacku **není**; quack v `GET /quacks` pořád je. Úklid: autor ho na konci smaže.
3. **„signed out gets 401“** — `DELETE` bez session (čistý `request` kontext) → 401.

Seedové quacky test nemaže; vlastní `Spam …` quacky si uklízí (1: smaže admin, 2: smaže autor).

### Ověření, že test něco hlídá

Dočasně v service `const isAdmin = false` → `pnpm e2e` → test 1 **musí spadnout** (403, quack zůstane) → vrátit. Ruční krok, do commitu nejde.

## 5. Pořadí stavby

Každý řez je samostatný commit (commit vždy až po tvém OK), po každém projde `pnpm check-all`.

| #   | Řez           | Obsah                                                                       | Ověření                                                                                                    |
| --- | ------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Server**    | Service podmínka, komentář v repository, Swagger, unit testy.               | `pnpm backend test`; ty ručně ve Swaggeru: admin 204, DeepDuckThoughts 403, Pond Admin 403, odhlášený 401. |
| 2   | **UI**        | `canDeleteQuack`, `isAdmin` v route + `QuackList`, dialog se jménem autora. | `pnpm frontend test:ci`; ty ručně se třemi účty: autor, někdo jiný, admin@example.com.                     |
| 3   | **E2E**       | Playwright setup, 3 testy, README, `.gitignore`.                            | `pnpm e2e` zelené; s vypnutou kontrolou červené.                                                           |
| 4   | **CLAUDE.md** | Nové pravidlo z moderace.                                                   | `pnpm lint`, `pnpm check-all` (rozlišit CRLF `format:check` od skutečné chyby).                            |

Server jde první, protože na něm záleží — UI je jen pohodlí. E2E až po UI, protože test 1 maže přes tlačítko.

## 6. Kandidát na pravidlo do CLAUDE.md

> **Permissions are decided in the service, from `@User()`.** Check `user.role` against `UserRole`, never names or emails. The UI may hide a control, but the server check is the one that's tested — unit test for each role, and an E2E test that fails when the check is switched off.

Finální znění doladíme po řezu 3, podle toho, co se při práci ukáže.

## 7. Otevřené body k review plánu

1. **Repository dostane `authorId` místo `user.id`** (viz výš) — OK?
2. **Playwright ve frontendu**, ne samostatný balíček `apps/e2e` — menší setup, Vitest s tím už počítá. OK?
3. **Test 3 (401)** jsem přidal navíc — story ho má v kritériích serveru, E2E ho nevyžaduje. Nechat?
