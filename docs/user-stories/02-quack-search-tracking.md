# 02 — Měření použití vyhledávání

## Story

**Jako** produktový tým
**chci** vědět, kolik lidí vyhledávání ve feedu používá a jak často nic nenajdou,
**abychom** se mohli rozhodnout, jestli do vyhledávání investovat dál, nebo ho odebrat.

## Proč

Story 01 je experiment. Filtruje se jen na frontendu, takže server o hledání neví a v aplikaci není žádná analytika. Bez této story nemáme jak odpovědět na otázku „používá se to?“.

**Závisí na [01-quack-search.md](01-quack-search.md).** Neimplementovat, dokud není 01 hotová.

## Akceptační kritéria

- [ ] Migrace přidá tabulku `search_event`.
- [ ] `POST /api/search-events` bez přihlášení vrátí `401`; s neplatným tělem (záporné číslo, chybějící pole, pole navíc) `400`; s platným `204` a uloží řádek s `userId` ze session.
- [ ] Unit test service ve stylu `quacks.service.spec.ts`.
- [ ] Frontend: napsání výrazu a 1 s pauza pošle právě jednu událost; další psaní v rámci 1 s předchozí neodešle; prázdné pole nepošle nic (test s fake timery).
- [ ] Selhání požadavku neovlivní vyhledávání ani nezobrazí chybu.
- [ ] Hledaný text se nikam neposílá ani neukládá.
- [ ] `pnpm check-all` projde.

## Mimo rozsah

- Ukládání hledaných výrazů.
- Dashboard / UI pro zobrazení statistik (stačí SQL).
- Externí analytické nástroje (PostHog, Plausible, …).
- Měření čehokoli jiného než vyhledávání.

## Developer notes

### Co se ukládá

Nová tabulka `SearchEvent`:

```prisma
model SearchEvent {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  resultCount Int
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@map("search_event")
}
```

(a do `model User` přidat `searchEvents SearchEvent[]`)

- `userId` se bere **ze session** (jako u `POST /api/quacks`), nikdy z těla požadavku.
- `resultCount` = kolik quacků hledání vrátilo. `0` = neúspěšné hledání.
- **Hledaný výraz se neukládá.** Pro otázku „používá se to?“ stačí počty. O ukládání výrazů se rozhodne později, pokud se vyhledávání osvědčí.

### Backend

- Nový modul podle vzoru `modules/quack`: controller → service → repository.
- `POST /api/search-events`, chráněno `AuthenticatedUserGuard`, vrací `204 No Content`.
- DTO: `{ resultCount: number }`, celé číslo `>= 0`, validováno (`whitelist`, `forbidNonWhitelisted` jako v `QuacksController`).
- Swagger anotace jako u quacků.
- Migrace přes `pnpm backend prisma:migrations:run`.

### Frontend

Kdy poslat událost: až se výraz v poli **1 s nezmění** (debounce), ne při každém stisku klávesy.

```
"d" → "du" → "duc" → "duck" … 1 s ticho → POST { resultCount: 3 }   (jedna událost)
```

- Samostatný hook (např. `features/quack/hooks/useLogSearch.ts`) čte oříznutý výraz a počet výsledků ze story 01. Filtrovací logiku ze story 01 **neměnit**.
- Prázdný výraz → nic se neposílá.
- Požadavek je fire-and-forget: chyba se tiše ignoruje, UI na něj nečeká a nic neukazuje.
- Přijímáme, že:
  - pauza uprostřed psaní (`duck` → pauza → `duck pond`) vytvoří dvě události,
  - zavření stránky / smazání pole do 1 s po dopsání nezaloguje nic.

### Jak se to vyhodnotí

```sql
-- kolik lidí hledalo za posledních 7 dní
SELECT count(DISTINCT "userId") FROM search_event
WHERE "createdAt" > now() - interval '7 days';

-- podíl hledání bez výsledku
SELECT avg(("resultCount" = 0)::int) FROM search_event
WHERE "createdAt" > now() - interval '7 days';
```
