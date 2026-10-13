# 03 — Ankety v quaccích

## Story

**Jako** přihlášený uživatel
**chci** k quacku přidat otázku s několika odpověďmi, ze kterých ostatní vyberou jednu,
**abychom** se rychle shodli (třeba kam na oběd) a nikdo nemusel ručně počítat odpovědi.

## Proč

Lidi dnes ptají ve quaccích („kam na oběd?“) a odpovědi počítají ručně. Někdo se vždycky přepočítá a dotaz se ztratí pod reakcemi.

Je to **experiment**: chceme ověřit, jestli lidi ankety používají. Proto co nejmenší verze — žádné uzavírání, termíny, živé aktualizace ani seznam hlasujících. Použití se vyhodnotí přímo z uložených anket a hlasů (viz [Jak se to vyhodnotí](#jak-se-to-vyhodnotí)), žádná další analytika není potřeba.

## Akceptační kritéria

### Založení ankety

- [ ] Ve formuláři nového quacku jde tlačítkem **„Add poll“** přidat anketu; text quacku je otázka. Quack bez ankety funguje jako dnes.
- [ ] Anketa má **2 až 7 možností**. Na začátku jsou 2 pole, „Add option“ přidá další (do 7), možnosti nad dvě jde odebrat.
- [ ] Každá možnost má po oříznutí mezer **1–50 znaků**. Prázdná pole neprojdou.
- [ ] Dvě stejné možnosti (bez ohledu na velikost písmen a okolní mezery) neprojdou — „Pizza“ a „ pizza “ je duplicita.
- [ ] Porušení pravidel uvidí uživatel u formuláře ještě před odesláním; **server stejná pravidla vynucuje sám** a nevalidní anketu odmítne.
- [ ] Quack s anketou může mít náladu (mood) jako kterýkoli jiný.

### Zobrazení a hlasování

- [ ] Anketa se zobrazí přímo v quacku ve feedu. Feed bez anket vypadá stejně jako dnes.
- [ ] U každé možnosti je vidět **počet hlasů a procento**, pod anketou celkový počet hlasů. Počty vidí všichni, i ti, kdo ještě nehlasovali.
- [ ] Hlasovat může každý přihlášený uživatel, **včetně autora ankety**.
- [ ] Každý má v anketě **nejvýš jeden hlas**. Moje volba je viditelně zvýrazněná.
- [ ] Klik na jinou možnost **přesune hlas** (u staré −1, u nové +1), bez potvrzování.
- [ ] Klik na možnost, pro kterou už hlasuju, nedělá nic. **Hlas zrušit nejde.**
- [ ] Hlasování je **anonymní**: nikdo (ani autor) nevidí, kdo pro co hlasoval. API vrací jen součty a můj vlastní hlas.

### Okamžitá odezva a chyby

- [ ] Po kliknutí se zvýraznění i počty změní **hned**, bez čekání na server a bez spinneru.
- [ ] Když hlas neprojde, anketa se **vrátí do stavu před kliknutím** a zobrazí se toast **„Your vote didn't go through. Try again.“** Nic se automaticky neopakuje.
- [ ] Po dokončení hlasování (úspěch i chyba) se počty načtou znovu ze serveru.

### Správnost počtů

- [ ] Jeden uživatel = jeden hlas v anketě **i při souběhu** (rychlé klikání, dvě otevřené záložky). Hlídá to databáze, ne frontend.
- [ ] Počty jsou vždy správné vůči stavu v době načtení. Hlasy ostatních se objeví po obnovení stránky, návratu na záložku nebo po mém hlasování — **živé aktualizace nejsou potřeba**.
- [ ] Hlas pro možnost z jiné ankety nebo pro neexistující možnost server odmítne.

### Kvalita

- [ ] Možnosti jdou ovládat klávesnicí; zvolená má `aria-pressed="true"`. Žádné stíny, vnořené karty ani hardcoded barvy ([DESIGN.md](../../DESIGN.md)).
- [ ] Testy podle [Testů](#testy).
- [ ] `pnpm check-all` projde.

## Mimo rozsah

- Uzavření ankety, termín, vyhlášení vítěze.
- Zrušení hlasu.
- Výběr více možností najednou.
- Seznam, kdo pro co hlasoval.
- Skrytí výsledků do odhlasování.
- Živé aktualizace (websocket, polling).
- Úprava ankety po zveřejnění (quacky dnes nejdou upravit ani smazat).
- Hledání v textu možností — vyhledávání ze story [01](01-quack-search.md) dál hledá jen v textu quacku.
- Samostatná stránka / sekce s anketami.
- Analytika navíc (stačí SQL nad uloženými daty).

## Developer notes

### Kontext v kódu

- Quack: `modules/quack` (controller → service → repository), `GET`/`POST /api/quacks`. `GET` dnes uživatele nepotřebuje — pro `myVoteOptionId` bude potřeba `@User()` i tam.
- Frontend: `features/quack` — `QuackForm.tsx` (react-hook-form + zod, limit 280 znaků zrcadlí DTO), `QuackItem.tsx`, `useAddQuack.ts`, `quackSchemas.ts`, `quackKeys.ts`.
- Chyby se ukazují přes `sonner` (vzor: `features/profile/components/ProfileForm.tsx`).
- Feed se refetchuje při návratu na záložku (`refetchOnWindowFocus: true` v `config/react-query.ts`) — to stačí, nic dalšího nepřidávat.

### Datový model

Anketa **nemá vlastní tabulku**: anketa = quack, který má možnosti. Tabulka `Poll` by neměla žádný vlastní sloupec (uzavírání/termín jsou mimo rozsah); kdyby přišly, doplní se migrací. Zdůvodnění a zamítnuté varianty: [plán](../plans/03-quack-poll.md#1-datový-model).

```prisma
model PollOption {
  id       String     @id @default(cuid())
  quack    Quack      @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId  String
  text     String     @db.VarChar(50)
  position Int
  votes    PollVote[]

  @@unique([quackId, position])
  @@unique([id, quackId]) // cíl složeného FK z PollVote
  @@map("poll_option")
}

model PollVote {
  id        String     @id @default(cuid())
  quack     Quack      @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  option    PollOption @relation(fields: [optionId, quackId], references: [id, quackId], onDelete: Cascade)
  optionId  String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  @@unique([quackId, userId]) // jeden hlas na uživatele a anketu — garance správnosti
  @@index([optionId])
  @@map("poll_vote")
}
```

(+ `pollOptions PollOption[]` a `pollVotes PollVote[]` do `Quack`, `pollVotes PollVote[]` do `User`; migrace přes `pnpm backend prisma:migrations:run`)

- `quackId` je v `PollVote` záměrně redundantní — bez něj nejde unikátní index „jeden hlas na anketu“.
- Složený FK `(optionId, quackId)` zaručí **v databázi**, že hlas nemůže ukazovat na možnost z jiné ankety.
- Počty se počítají z `poll_vote`, žádné uložené počítadlo — jedno místo pravdy.
- `updatedAt` na hlasu ukáže, jak často lidi hlas mění.

### API

**Založení:** `POST /api/quacks` dostane volitelné `pollOptions`:

```json
{
  "text": "Where do we go for lunch?",
  "pollOptions": ["Pizza", "Sushi", "Canteen"]
}
```

- `pollOptions`: pole 2–7 stringů, každý po `trim()` 1–50 znaků, bez duplicit (case-insensitive) → jinak `400`.
- Quack a možnosti se zakládají v **jedné transakci** (vnořený `create` v Prisma).

**Hlasování:** `PUT /api/quacks/:quackId/vote` s tělem `{ "optionId": "..." }`, chráněno `AuthenticatedUserGuard`, `userId` ze session.

- Implementovat jako **upsert** podle `(quackId, userId)` — první hlas i změna jsou stejná operace a souběžné požadavky nemůžou vytvořit dva hlasy.
- Hlas pro **stejnou možnost** jako stávající hlas se **nezapisuje** (service ho nejdřív přečte) — `updatedAt` se neposune a metrika „změny hlasu“ zůstane čistá.
- Odpověď `200`: aktuální stav ankety (stejný tvar jako níž), ať frontend může rovnou opravit cache.
- `401` bez přihlášení, `404` neexistující quack / quack bez ankety, `400` možnost z jiné ankety / nevalidní tělo.

**Čtení:** každý quack v `GET /api/quacks` má `poll` (u quacku bez možností `null`):

```json
"poll": {
  "options": [
    { "id": "…", "text": "Pizza",   "votes": 3 },
    { "id": "…", "text": "Sushi",   "votes": 1 },
    { "id": "…", "text": "Canteen", "votes": 0 }
  ],
  "totalVotes": 4,
  "myVoteOptionId": "…" // nebo null
}
```

- Možnosti seřazené podle `position`.
- Počty spočítat v DB (`groupBy`/`_count`), ne posílat jednotlivé hlasy. **Cizí `userId` nikdy neopouštějí server.**

### Frontend

- Formulář: rozšířit zod schéma v `QuackForm.tsx` o volitelné `poll.options` se stejnými pravidly jako DTO; pole přes `useFieldArray`.
- Výpočty (procenta, optimistický přesun hlasu) jako **čisté funkce** v `features/quack/lib/` s unit testy:
  - `pollPercentages(options, total)` — zaokrouhlení na celá čísla, `0` hlasů → `0 %` (žádné dělení nulou). Součet nemusí dát přesně 100 %, to je v pořádku.
  - `applyVote(poll, optionId)` — vrátí nový stav: odečte u staré volby, přičte u nové, nastaví `myVoteOptionId`. Hlas pro stejnou možnost → beze změny.
- Hook `useVote` (vzor `useAddQuack.ts`) s optimistickým updatem v TanStack Query:
  - `onMutate`: `cancelQueries`, snapshot cache, `setQueryData` s `applyVote`.
  - `onError`: vrátit snapshot + `toast.error("Your vote didn't go through. Try again.")`.
  - `onSettled`: `invalidateQueries(quackKeys…)`.
- Komponenta `QuackPoll` v `QuackItem`: každá možnost jako `Button` z kitu s `aria-pressed`, uvnitř text, počet, procento a pruh poměru (barvy jen z tokenů v `global.css`). Pod možnostmi „4 votes“.

### Seed

Přidat do `seed-database.ts` jednu anketu, ať jsou příklady a testové fixtures nad reálnými daty — např. quack od **Caffeinated Duck** „Where do we go for lunch?“ s možnostmi `Pizza` / `Sushi` / `Canteen` a pár hlasy od ostatních seed uživatelů.

### Testy

- **Backend (service spec ve stylu `quacks.service.spec.ts`):** založení s 1 a 8 možnostmi → chyba; duplicita „Pizza“ / „ pizza “ → chyba; první hlas; změna hlasu (počty 1→0 a 0→1); opakovaný hlas pro stejnou možnost nic nezapíše; možnost z jiné ankety → chyba; quack bez ankety → 404; `myVoteOptionId` jen pro aktuálního uživatele.
- **Frontend lib:** `pollPercentages`, `applyVote` (první hlas, změna, stejná možnost).
- **Frontend komponenty:** formulář (přidání/odebrání možností, limity 2 a 7, duplicita); `QuackPoll` — zvýraznění volby, okamžitá změna po kliknutí, návrat stavu a toast při chybě (mock mutace jako v `ProfileForm.test.tsx`).

### Jak se to vyhodnotí

```sql
-- kolik anket vzniklo za posledních 14 dní
SELECT count(DISTINCT q.id) FROM quack q JOIN poll_option o ON o."quackId" = q.id
WHERE q."createdAt" > now() - interval '14 days';

-- kolik různých lidí hlasovalo
SELECT count(DISTINCT "userId") FROM poll_vote WHERE "createdAt" > now() - interval '14 days';

-- průměrný počet hlasů na anketu
SELECT avg(c) FROM (
  SELECT count(v.id) c FROM (SELECT DISTINCT "quackId" FROM poll_option) p
  LEFT JOIN poll_vote v ON v."quackId" = p."quackId" GROUP BY p."quackId"
) t;

-- jak často lidi hlas mění
SELECT avg(("updatedAt" > "createdAt")::int) FROM poll_vote;
```
