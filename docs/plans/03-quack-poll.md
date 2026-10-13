# Plán — 03 Ankety v quaccích

Story: [../user-stories/03-quack-poll.md](../user-stories/03-quack-poll.md)

## 1. Datový model

### Rozhodnutí: žádná tabulka `Poll`

Anketa = quack, který má možnosti. Story v developer notes navrhovala samostatnou tabulku `Poll` (1:1 ke quacku), ale ta by neměla žádný vlastní sloupec — `createdAt` má quack, uzavírání/termín jsou mimo rozsah. Byla by to jen mezivrstva, přes kterou se joinuje. Možnosti i hlasy proto visí přímo na quacku.

Až přijde uzavírání ankety, tabulka `Poll` se dá doplnit migrací (nebo sloupec `pollClosedAt` na `Quack`).

```prisma
model Quack {
  // … stávající pole …
  pollOptions PollOption[]
  pollVotes   PollVote[]
}

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

  @@unique([quackId, userId]) // jeden hlas na uživatele a anketu
  @@index([optionId])
  @@map("poll_vote")
}

model User {
  // … stávající pole …
  pollVotes PollVote[]
}
```

### Které pravidlo ze story hlídá kdo

| Pravidlo                               | Kde                                                                    | Proč tam                                                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jeden uživatel = jeden hlas v anketě   | **DB** `@@unique([quackId, userId])`                                   | Jediné místo, které vydrží souběh (dvě záložky, rychlé klikání).                                                                                                     |
| Hlas jen pro možnost z téže ankety     | **DB** složený FK `(optionId, quackId) → poll_option(id, quackId)`     | Bez něj by šel uložit hlas s `quackId` jedné ankety a možností z jiné.                                                                                               |
| Pořadí možností je jednoznačné         | **DB** `@@unique([quackId, position])`                                 | Levné, chrání před chybou v kódu.                                                                                                                                    |
| 2–7 možností, 1–50 znaků, bez duplicit | **DTO + service** (+ `VarChar(50)` v DB)                               | Možnosti vznikají jednou v jedné transakci a nikdy se nemění → žádný souběh. Case-insensitive unikát v DB by vyžadoval ruční SQL index, Prisma ho ve schématu neumí. |
| Hlasovat jde jen v quacku s anketou    | **service** (quack nemá možnosti → `404`)                              | Vyplývá i z FK, ale chceme srozumitelnou chybu.                                                                                                                      |
| Anonymita                              | **repository / DTO** — ven jdou jen součty a hlas aktuálního uživatele | —                                                                                                                                                                    |

### Co jsem zvažoval a zamítl

- **Možnosti jako `String[]` / JSON na quacku, hlas jako index.** Méně tabulek, ale hlas by odkazoval na pozici v poli bez FK — DB by nehlídala nic.
- **Počítadlo `voteCount` na `PollOption`.** Rychlejší čtení, ale dvě místa pravdy a riziko rozjetí při souběhu přesně tam, kde story chce „čísla musí sedět“. Počítá se z `poll_vote` (`_count`); při desítkách hlasů je to zanedbatelné.

## 2. Endpointy

### `GET /api/quacks` — rozšíření

Controller začne brát `@User()` (už je za `AuthenticatedUserGuard`). Každý quack dostane `poll`:

```json
"poll": {
  "options": [
    { "id": "opt_1", "text": "Pizza",   "votes": 3 },
    { "id": "opt_2", "text": "Sushi",   "votes": 1 },
    { "id": "opt_3", "text": "Canteen", "votes": 0 }
  ],
  "totalVotes": 4,
  "myVoteOptionId": "opt_1"
}
```

`null` u quacku bez možností. Jeden Prisma dotaz:

```ts
include: {
  user: true,
  pollOptions: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
  pollVotes: { where: { userId }, select: { optionId: true } }, // jen MŮJ hlas
}
```

### `POST /api/quacks` — rozšíření

Volitelné `pollOptions: string[]`:

```json
{
  "text": "Where do we go for lunch?",
  "mood": "happy",
  "pollOptions": ["Pizza", "Sushi", "Canteen"]
}
```

- DTO: `@IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(7)`, každý prvek `@IsString()` + trim + délka 1–50 (trim přes `@Transform`, aby „ “ neprošlo jako 3 znaky).
- Duplicita (case-insensitive po trimu) → vlastní validátor v DTO, ať je to `400` se srozumitelnou hláškou.
- Repository: `quack.create` s vnořeným `pollOptions: { create: [...] }` — Prisma to udělá v jedné transakci.
- Odpověď `201` obsahuje `poll` (0 hlasů, `myVoteOptionId: null`).

### `PUT /api/quacks/:quackId/vote` — nový

Tělo `{ "optionId": "opt_2" }`, `userId` ze session. Leží v `QuacksController` (anketa je součást quacku).

| Situace                                       | Odpověď                 |
| --------------------------------------------- | ----------------------- |
| OK (první hlas, změna i stejná možnost)       | `200` + aktuální `poll` |
| Nepřihlášený                                  | `401`                   |
| Quack neexistuje / nemá anketu                | `404`                   |
| `optionId` není z této ankety, nevalidní tělo | `400`                   |

Implementace:

```ts
prisma.pollVote.upsert({
  where: { quackId_userId: { quackId, userId } },
  create: { quackId, optionId, userId },
  update: { optionId },
});
```

- Upsert s jedním unikátním klíčem a bez vnořených zápisů Prisma provede jako `INSERT … ON CONFLICT` → dva souběžné první hlasy nevytvoří dvě řádky ani nespadnou.
- Pojistka: kdyby přesto přišlo `P2002`, upsert se jednou zopakuje.
- `P2003` (porušený složený FK = možnost z jiné ankety) → `400`.
- Stejná možnost znovu → service nejdřív přečte stávající hlas a při shodě **nic nezapisuje**, jen vrátí aktuální `poll`. `updatedAt` se tak neposune a metrika „jak často lidi mění hlas“ zůstane čistá. (Frontend v tomhle případě nic neposílá; jde o dvě záložky nebo přímé volání API.)

## 3. Frontend

- `quackSchemas.ts`: `pollSchema` + `poll: pollSchema.nullable()` na quacku.
- `lib/pollPercentages.ts`, `lib/applyVote.ts` — čisté funkce s testy (viz story).
- `components/QuackPoll.tsx` v `QuackItem`, controlled: `poll` + `onVote(optionId)`.
- `api/voteInPoll.ts` + `hooks/useVote.ts`:
  - `scope: { id: "quack-vote" }` — TanStack Query v5 pak hlasy **řadí za sebe**. Rychlé klikání Pizza → Sushi → Pizza nedoběhne na serveru v jiném pořadí a poslední klik vyhraje. (Jedna fronta pro všechny ankety: `scope` je statický na hooku a hook je v route jeden. Hlasy jsou vzácné a rychlé, takže to nevadí.)
  - `onMutate` běží hned při kliknutí (ve frontě čeká až request): `cancelQueries(quackKeys.lists())`, snapshot, `setQueryData` s `applyVote`.
  - `onError`: `toast.error("Your vote didn't go through. Try again.")` a vrátit snapshot — **jen pokud je to poslední rozpracovaný hlas**, jinak by rollback smazal novější kliknutí.
  - `onSettled`: `invalidateQueries(quackKeys.all())` — taky jen u posledního rozpracovaného hlasu, ze stejného důvodu.
- `QuackForm.tsx`: „Add poll“ → `useFieldArray` s možnostmi, zod pravidla stejná jako DTO.

## 4. Pořadí stavby — vertikální řezy

Každý řez je samostatný commit, po každém projde `pnpm check-all` a aplikace funguje. Backend pole jsou aditivní a zod na frontendu neznámé klíče zahazuje, takže žádný řez nerozbije ten předchozí.

| #   | Řez                     | Obsah                                                                                                                                                                    | Ověření                                                                                                                      |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Datový model + seed** | Prisma schéma, migrace, seed: anketa „Where do we go for lunch?“ (Caffeinated Duck) s Pizza / Sushi / Canteen a hlasy od BreadCritic, DeepDuckThoughts, MigrationSeason. | Migrace projde na čisté DB; seed proběhne; review schématu podle tabulky výš.                                                |
| 2   | **Zobrazení ankety**    | BE: `GET` vrací `poll` + `myVoteOptionId`. FE: zod schéma, `pollPercentages`, `QuackPoll` jen pro čtení (počty, %, zvýraznění mé volby).                                 | Service spec (součty, cizí hlasy se neposílají), lib testy, test komponenty.                                                 |
| 3   | **Hlasování**           | BE: `PUT …/vote` (upsert, 404/400). FE: `applyVote`, `useVote` s optimistickým updatem, rollback + toast.                                                                | Service spec (první hlas, změna, stejná možnost, cizí možnost), lib testy, test komponenty s mockem mutace (úspěch + chyba). |
| 4   | **Založení ankety**     | BE: `pollOptions` v DTO + repository. FE: „Add poll“ ve `QuackForm`.                                                                                                     | DTO spec (1 a 8 možností, prázdná, 51 znaků, duplicita), formulářové testy.                                                  |

Proč toto pořadí: datový model jde první a sám, aby se dal zkontrolovat dřív, než na něm cokoli stojí. Díky seedu je anketa vidět a jde o ní hlasovat **ještě před** formulářem na zakládání. Hlasování (řez 3) je nejrizikovější část story (správnost, optimistický update), takže jde před formulář, který je rutinní.

## 5. Rozhodnutí z review plánu

Žádné otevřené body.

1. **Bez tabulky `Poll`** — schváleno, developer notes ve story upraveny (model, `pollOptions` v `POST`, `PUT /api/quacks/:quackId/vote`).
2. **Hlas pro stejnou možnost se nezapisuje** — schváleno, viz endpoint výš.
