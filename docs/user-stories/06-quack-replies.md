# 06 — Odpovědi na quacky (vlákna)

## Story

**Jako** přihlášený uživatel
**chci** odpovědět přímo na quack a vidět odpovědi pod ním,
**abych** věděl, kdo na co reaguje, a nemusel psát nový quack začínající „@jméno…“.

## Proč

Lidi dnes pod quackem diskutují tak, že napíšou nový quack, který začíná „@jméno…“. Ve feedu jsou pak vytržené z kontextu a nikdo neví, kdo na co reaguje.

Product owner chce dvě věci, které jdou proti sobě:

- **Odpovědi patří lidem, kteří je napsali.** Když autor smaže quack, na který už někdo odpověděl, odpovědi s ním nesmí zmizet.
- **Smazaný obsah musí opravdu zmizet.** Když někdo svůj quack smaže, jeho text v aplikaci nezůstane.

Proto se ze smazaného quacku, pod kterým už jsou odpovědi, stane prázdné místo „This quack was deleted“. Text, autor, nálada ani anketa po něm nezůstanou, ale vlákno drží pohromadě. Quack bez odpovědí zmizí úplně, jako dnes.

## Akceptační kritéria

Texty v UI jsou anglicky jako zbytek aplikace („Reply“, „This quack was deleted“, „↪ Replying to @…“).

### Odpovídání

- [ ] Pod každým quackem, i pod odpovědí, je tlačítko **Reply**. Otevře formulář přímo pod quackem.
- [ ] Odpovídat jde i na odpovědi, do libovolné hloubky.
- [ ] Odpověď má **text a volitelnou náladu**, předvyplněnou z profilu jako u nového quacku. Platí stejná pravidla pro text jako u quacku.
- [ ] Odpověď **nemůže mít anketu**. Server to odmítne, i když request nepřijde přes UI.
- [ ] Na **smazaný quack odpovědět nejde** a tlačítko Reply u něj není. Kdo měl otevřenou starou stránku a odpověď přesto odešle, dostane chybu a vlákno se znovu načte.
- [ ] Odpověď se nikdy neztratí kvůli tomu, že někdo ve stejnou chvíli maže quack, na který odpovídá.

### Feed (záložka All)

- [ ] Feed ukazuje **jen quacky, ne odpovědi**, ve stejném pořadí jako dnes (nejnovější nahoře).
- [ ] U quacku s odpověďmi je **💬 N**, kde N je počet odpovědí v celém vlákně, včetně odpovědí na odpovědi a bez smazaných. Klik otevře vlákno.
- [ ] Smazaný quack, pod kterým jsou odpovědi, **zůstává ve feedu** na svém místě jako „This quack was deleted · 💬 N“ a vlákno jde otevřít.

### Záložka Mine

- [ ] Mine ukazuje **všechny moje quacky i moje odpovědi**, nejnovější nahoře.
- [ ] Odpověď v Mine má nad textem řádek **„↪ Replying to @CaffeinatedDuck“**, a pokud byl ten quack smazán, **„↪ Replying to a deleted quack“**. Klik otevře vlákno na téhle odpovědi.
- [ ] Smazané quacky v Mine nejsou.
- [ ] Admin vidí v Mine jen své quacky (beze změny proti story 05).

### Stránka vlákna

- [ ] Nahoře je původní quack, pod každým quackem jeho odpovědi **od nejstarší po nejnovější**.
- [ ] Odpovědi jsou odsazené **nejvýš do 3. úrovně**. Hlubší odpovědi už se dál neodsazují a nesou „↪ @jméno“ (nebo „↪ smazaný quack“), aby bylo vidět, komu odpovídají.
- [ ] Odkaz na odpověď, třeba z Mine, otevře celé vlákno, odroluje na ni a krátce ji zvýrazní.
- [ ] Smazaný quack je šedý řádek **„This quack was deleted“** bez autora, času, nálady a tlačítek.
- [ ] Odkaz na quack, který neexistuje nebo byl smazán celý, ukáže **„This quack doesn't exist“** s odkazem zpět na feed.
- [ ] Koš u quacku ve vlákně vidí autor a admin, stejně jako ve feedu.

### Mazání

- [ ] Kdo smí mazat, se nemění: **autor, nebo admin** (story 05). Kdo jiný se o to pokusí, i přímo přes API, dostane chybu a quack zůstane.
- [ ] **Quack bez odpovědí** zmizí úplně, i s anketou a hlasy, jako dnes.
- [ ] **Quack s odpověďmi** se změní na „This quack was deleted“. Jeho text, autor, nálada i anketa zmizí z aplikace i z databáze. **Odpovědi zůstanou na svém místě.**
- [ ] Když se smaže poslední odpověď pod smazaným quackem, zmizí i to prázdné místo „This quack was deleted“, a tak dál nahoru po vlákně.

### Ruční ověření (seed data)

Seed obsahuje vlákno pod existujícím quackem od **CaffeinatedDuck**:

```
CaffeinatedDuck: just spilled coffee on my keyboard
├─ BreadCritic: Rice works. So does bread, allegedly.
│  └─ CaffeinatedDuck: it was a sourdough keyboard now
└─ DeepDuckThoughts: Is the keyboard wet, or is the coffee just very dry?
```

- [ ] Feed All ukazuje u „just spilled coffee…“ **💬 3** a samotné odpovědi ve feedu nejsou.
- [ ] **caffeinatedduck@example.com** v Mine vidí svůj quack i odpověď „it was a sourdough keyboard now“ s „↪ Replying to @BreadCritic“.
- [ ] **BreadCritic** smaže „Rice works…“. Ve vlákně je místo ní „This quack was deleted“ a pod ním odpověď CaffeinatedDuck. CaffeinatedDuck v Mine vidí „↪ Replying to a deleted quack“.
- [ ] **deepduckthoughts@example.com** u odpovědi BreadCritic koš nevidí a přes Swagger dostane 403.
- [ ] **admin@example.com** smaže odpověď kohokoli.

### Kvalita

- [ ] Testy podle [Testů](#testy), včetně E2E.
- [ ] Žádné nové stíny, vnořené karty ani hardcoded barvy ([DESIGN.md](../../DESIGN.md)). Odsazení vlákna jen levou linkou.
- [ ] `pnpm check-all` projde.

## Mimo rozsah

- Mazání uživatelského účtu (viz [rozhodnutí 6](#rozhodnutí) a [ADR 0001](../adr/0001-smazany-quack-jako-nahrobek.md)).
- Notifikace „někdo ti odpověděl“.
- Úprava odpovědi i quacku.
- Řazení feedu podle poslední aktivity ve vlákně.
- Zmínky `@jméno` s odkazem nebo našeptávačem.
- Ankety v odpovědích.
- Stránkování vlákna (vlákno se načte celé).
- Obnova smazaného quacku.
- Sbalování a rozbalování větví vlákna.

## Developer notes

### Kontext v kódu

Nový modul se nezakládá, všechno patří do quacků.

**Backend: `apps/backend/src/modules/quack/`**

- `repositories/quack.repository.ts`:
  - `getQuacks` dostane `scope` a filtr `parentId: null` / `userId`;
  - nové metody `getThread` a `createReply`;
  - `deleteQuack` se přepíše na transakci s náhrobkem a úklidem (viz [Mazání](#mazání-1)).
- `services/quacks.service.ts`: pravidla pro odpověď a mazání, oprávnění dál z `@User()`.
- `controllers/quacks.controller.ts`: nové endpointy (viz [API](#api)) a nový `create-reply.dto.ts`.
- `controllers/dto/quack.response.dto.ts` a `domain/quack.ts`: nullable `text`, `user`, `mood` a nová pole. Každé místo, které čte `quack.user.username`, musí počítat s `null` (TypeScript je najde).
- `scripts/seed/seed/seed-database.ts`: vlákno výše.

**Frontend: `apps/frontend/src/`**

- `features/quack/api/`: zod schéma s nullable poli, `getThread`, `createReply` a `scope` u seznamu.
- `features/quack/lib/buildThreadTree.ts`: čistá funkce, která z plochého seznamu složí strom (pořadí, hloubka, omezení odsazení), a test k ní.
- `features/quack/components/`: formulář odpovědi (znovu použije picker nálady), řádek náhrobku, počet 💬, řádek „↪ Replying to…“.
- `routes/_ProtectedPages/quacks.tsx`: Mine už nefiltruje podle `userId` na frontendu, volá API se `scope=mine`.
- Nová route `routes/_ProtectedPages/quacks.$quackId.tsx`, která podle `#replyId` odroluje na odpověď.

### Datový model

Odpověď je `Quack` s `parentId`. Smazaný quack s odpověďmi je **náhrobek**: řádek s `deletedAt`, bez `text`, `userId` a `mood`. Nejde o soft delete ze story 05, protože obsah se nedá obnovit, v databázi už není.

```prisma
model Quack {
  id        String     @id @default(cuid())
  // NULL only on a tombstone (deletedAt set) — see quack_tombstone_check.
  text      String?    @db.Text
  mood      QuackMood?
  // NULL only on a tombstone: a deleted quack keeps no trace of its author.
  // Cascade stays: deleting a User is out of scope (story 06). Whoever builds
  // it must turn the user's replied-to quacks into tombstones first —
  // otherwise the parent foreign key below makes the delete fail.
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt
  // Set when the quack was deleted while it had replies. The row stays so
  // the thread holds together; its content is gone.
  deletedAt DateTime?

  // The quack this one replies to. NULL for a top-level quack.
  // NoAction: the database never deletes a quack that still has replies.
  // (NoAction, not Restrict — Postgres checks it at the end of the
  // statement, so a cascade that removes a parent and all its replies passes.)
  parent    Quack?     @relation("QuackReplies", fields: [parentId], references: [id], onDelete: NoAction)
  parentId  String?
  replies   Quack[]    @relation("QuackReplies")

  // The top-level quack of the thread. NULL for a top-level quack itself.
  // Derived from the parent chain and stored so a whole thread loads in one
  // query. Written once when the reply is created; quacks never move.
  root          Quack?  @relation("QuackThread", fields: [rootId], references: [id], onDelete: NoAction)
  rootId        String?
  threadReplies Quack[] @relation("QuackThread")

  // A quack with options is a poll — there is no separate poll table.
  // Replies never have one (CreateReplyDto has no field for it).
  pollOptions PollOption[]
  pollVotes   PollVote[]

  @@index([userId])
  @@index([parentId])
  @@index([rootId])
  @@map("quack")
}
```

Prisma CHECK constrainty ve schématu neumí, takže se dopíšou ručně do `migration.sql`. Migraci vytvoř přes `pnpm backend prisma:migrations:generate quack_replies` (`--create-only`), SQL doplň a teprve pak ji spusť.

```sql
-- A row is either a live quack (text + author) or a tombstone (nothing).
ALTER TABLE "quack" ADD CONSTRAINT "quack_tombstone_check" CHECK (
  ("deletedAt" IS NULL     AND "text" IS NOT NULL AND "userId" IS NOT NULL)
  OR
  ("deletedAt" IS NOT NULL AND "text" IS NULL     AND "userId" IS NULL AND "mood" IS NULL)
);

-- A reply has both a parent and a root; a top-level quack has neither.
ALTER TABLE "quack" ADD CONSTRAINT "quack_thread_check" CHECK (
  ("parentId" IS NULL) = ("rootId" IS NULL)
);
```

**Co je uloženo dvakrát:**

- **`rootId`** se dá odvodit z řetězu `parentId`. Repository ho zapíše jednou při vytvoření odpovědi (`parent.rootId ?? parent.id`) a pak se nemění, protože quacky se nepřesouvají. Že je vyplněný právě u odpovědí, hlídá `quack_thread_check`. Že ukazuje na správný kořen, hlídá unit test.
- **Stav „smazáno“** je vidět z `deletedAt` i z prázdných `text`/`userId`. Aby se nerozešly, hlídá `quack_tombstone_check`.

**Dotazy pro to, co uživatel vidí.** Všechno jsou běžné Prisma dotazy bez raw SQL a bez rekurze:

| Obrazovka | Dotaz                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feed All  | `quack.findMany({ where: { parentId: null }, include: { user, poll…, _count: { select: { threadReplies: { where: { deletedAt: null } } } } }, orderBy: { createdAt: 'desc' } })`                                                                |
| Mine      | `quack.findMany({ where: { userId: me }, include: { user, poll…, parent: { select: { deletedAt, user: { select: { username } } } }, _count: … }, orderBy: { createdAt: 'desc' } })`. Filtr `userId` vyřadí náhrobky sám.                        |
| Vlákno    | 1) `findUnique({ where: { id }, select: { id, rootId } })` → `root = rootId ?? id`; 2) `findMany({ where: { OR: [{ id: root }, { rootId: root }] }, include: { user, poll… }, orderBy: { createdAt: 'asc' } })` a strom složí `buildThreadTree` |

### API

- **`GET /api/quacks?scope=all|mine`**: bez parametru nebo se `scope=all` vrací kořeny, se `scope=mine` moje živé quacky i odpovědi. „Já“ se bere ze session, v URL není `userId`.
- **`GET /api/quacks/:quackId/thread`**: celé vlákno jako plochý seznam (kořen a odpovědi s `parentId`). Funguje s id kořene i libovolné odpovědi. **404**, když quack neexistuje.
- **`POST /api/quacks/:quackId/replies`** s tělem `{ text, mood? }`: autor ze session, `rootId` dopočítá server.
  - **400**: `pollOptions` v těle, nevalidní text.
  - **404 „Quack not found“**: rodič neexistuje nebo je náhrobek. Stejně jako u neexistujícího quacku, aby se neprozradilo, že tam něco bylo.
  - **401**: nepřihlášený uživatel.
- **`DELETE /api/quacks/:quackId`**: oprávnění beze změny (autor nebo `admin`, jinak **403**). **404** i na náhrobek.
- Response DTO a zod schéma: `text`, `user` a `mood` jsou nullable a přibývají `parentId`, `rootId`, `deletedAt`, `replyCount` a v Mine `parent` (`{ username }`, nebo `null` u náhrobku).
- Swagger popisy odpovídají novému chování.

### Mazání

V jedné transakci:

1. Má quack odpovědi (i náhrobky)? **Ne:** `delete` a anketa s hlasy zmizí kaskádou, jako dnes. **Ano:** `update` na náhrobek (`text`, `userId`, `mood` → `NULL`, `deletedAt = now()`) a `pollOption.deleteMany` (hlasy zmizí kaskádou).
2. **Úklid nahoru:** pokud byl quack smazán úplně a jeho rodič je náhrobek bez dalších dětí, smazat i rodiče a pokračovat nahoru. Invariant: **každý náhrobek má aspoň jednu živou odpověď**.

**Souběh s odpovědí:**

`deleteQuack` i `createReply` v transakci nejdřív zamknou řádek quacku, pod kterým se vlákno mění (`SELECT … FOR UPDATE` přes `$queryRaw`, Prisma řádkový zámek neumí). Proto se nikdy nepotkají:

- Kdo odpovídá na quack, který se právě maže, počká. Pak uvidí náhrobek (404), nebo quack už neexistuje (404).
- Kdo maže quack, na který se právě odpovídá, počká, až je odpověď uložená. Pak ji při počítání uvidí a udělá náhrobek.
- Kdyby zámek někdo obešel, tvrdé smazání quacku s odpovědí stejně zastaví cizí klíč `NoAction` (`P2003`). Ověřeno při vypnuté větvi s náhrobkem.

### Seed

Do `seed-database.ts` přidat vlákno z [Ručního ověření](#ruční-ověření-seed-data) pod existující quack „just spilled coffee on my keyboard“. Náhrobek v seedu není, E2E testy si mazání vytvářejí samy.

### Testy

- **Backend (service a repository spec, DTO spec):**
  - odpověď: živý rodič, náhrobek → 404, neexistující → 404, `rootId` u odpovědi na kořen i na hlubší odpověď;
  - `pollOptions` v odpovědi → 400 (`CreateReplyDto` se stejným nastavením `ValidationPipe` jako controller);
  - mazání: bez odpovědí → delete, s odpověďmi → náhrobek, úklid nahoru přes víc úrovní;
  - oprávnění pro roli `user` (autor i cizí) a `admin`.
- **Frontend lib:** `buildThreadTree` (pořadí, hloubka nad 3, náhrobek uprostřed vlákna).
- **Frontend komponenty:** formulář odpovědi, řádek náhrobku bez tlačítek, „↪ Replying to a deleted quack“ v Mine.
- **Fixtures** používají jména a texty ze seedu.
- **E2E (`apps/frontend/e2e/replies.e2e.ts`):** testy si vytvářejí vlastní data s unikátním textem (`Reply ${Date.now()}`).
  - „reply appears under the quack“: odpověď je ve vlákně a ve feedu přibude 💬 1.
  - „replies survive when the parent is deleted“: A napíše quack, B odpoví, A quack smaže. Ve vlákně je „This quack was deleted“, text A nikde není a odpověď B zůstala.
  - „cannot reply to a deleted quack“: API vrátí 404.
  - „nobody can delete someone else's reply“: API vrátí 403.
  - Když se v service vypne větev s náhrobkem (vždy tvrdé mazání), druhý test **spadne**. Ověřit ručně.

### Migrace na produkci

Migrace (`prisma migrate deploy` při startu) na existujících datech projde:

- `text`, `userId`: `DROP NOT NULL`, jen změna metadat.
- `deletedAt`, `parentId`, `rootId`: nové nullable sloupce bez defaultu, jen změna metadat, existující řádky dostanou `NULL`.
- Cizí klíče a indexy na nových sloupcích: všechny hodnoty jsou `NULL`, takže validace je triviální.
- CHECK constrainty: každý existující quack má text, autora, `deletedAt = NULL` a žádného rodiče, takže obě podmínky projdou. Kontrola projde tabulku pod zámkem. U velké tabulky by se použilo `NOT VALID` a pak `VALIDATE CONSTRAINT`.
- **Nevratnost:** po prvním náhrobku nejde vrátit `text NOT NULL`. Backend a frontend se nasazují spolu, protože starý frontend nečeká `text: null`.

### Rozhodnutí

| #   | Rozhodnutí                                                                                                              | Zamítnutá varianta                                                                               | Proč zamítnuta                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Odpověď je `Quack` s `parentId`**, hloubka libovolná.                                                                 | Samostatný model `Reply`; `Quack` jen s jednou úrovní.                                           | `Reply` by znamenal psát mazání, moderaci, oprávnění a testy podruhé. Jedna úroveň by omezila diskusi.                                                                                                                                                                          |
| 2   | **Feed ukazuje kořeny s 💬, vlákno je na `/quacks/:id`** a načte se jedním dotazem přes `rootId`.                       | Celý strom ve feedu; vlákno načítané po úrovních jen přes `parentId`.                            | Strom ve feedu potřebuje rekurzivní SQL nebo načtení všeho a na mobilu se nevejde. Načítání po úrovních znamená spoustu requestů a klikání.                                                                                                                                     |
| 3   | **All jen kořeny, Mine kořeny i moje odpovědi**. Filtr se přesouvá na server (`?scope=mine`).                           | Jen kořeny všude; všechno všude.                                                                 | Bez odpovědí v Mine by autor svou odpověď nenašel ani nesmazal („odpovědi patří lidem, kteří je napsali“). Odpovědi ve feedu All jsou přesně ten zmatek, na který si PO stěžuje.                                                                                                |
| 4   | **Náhrobek jen když je potřeba**: bez odpovědí tvrdé smazání, s odpověďmi vyprázdněný řádek a úklid nahoru.             | Vždy tvrdě smazat a odpovědím dát `SetNull`; náhrobek vždy.                                      | `SetNull` rozbije vlákno a odpovědi se objeví ve feedu bez kontextu, nevratně. Náhrobek vždy by zaplnil feed prázdnými řádky tam, kde nebylo co zachovat.                                                                                                                       |
| 5   | **Náhrobek nemá autora** (`userId = NULL`).                                                                             | Autora nechat; nechat ho v DB a jen ho skrýt v API.                                              | Když maže admin, „smazaný quack od @X“ tvrdí nepravdu a prozrazuje, že X do vlákna psal. Skrytí jen v API nechává data v DB, takže „opravdu zmizet“ by platilo jen napůl.                                                                                                       |
| 6   | **`Quack.user` zůstává `Cascade`, mazání účtu je mimo rozsah.** [ADR 0001](../adr/0001-smazany-quack-jako-nahrobek.md). | `onDelete: SetNull`.                                                                             | Text quacků smazaného uživatele by v DB zůstal bez autora, což přímo porušuje „obsah musí opravdu zmizet“. S `Cascade` a `NoAction` na rodiči databáze raději odmítne smazání účtu, než aby potichu smazala cizí odpovědi.                                                      |
| 7   | **`deletedAt DateTime?` a CHECK constraint** hlídá, že náhrobek je prázdný a živý quack plný.                           | Náhrobek poznaný podle `text IS NULL`; `isDeleted Boolean`.                                      | `text IS NULL` je skrytý význam, který se rozbije, až přibude quack bez textu. Boolean ztratí čas smazání a jinak nic nepřidá.                                                                                                                                                  |
| 8   | **Odpověď má text a mood, anketu ne.**                                                                                  | Jen text; všechno včetně ankety.                                                                 | Mood znovu použije existující picker a předvolbu z profilu. Ankety hluboko ve vlákně nikdo neuvidí a stránka vlákna by musela umět hlasovat.                                                                                                                                    |
| 9   | **Na náhrobek nejde odpovědět, server vrátí 404.**                                                                      | Odpovídat na náhrobek; 409 Conflict.                                                             | Reakce na prázdné místo nedávají smysl a prodlužují život náhrobků. 404 je stejné jako u neexistujícího quacku a neprozrazuje, že tam něco bylo.                                                                                                                                |
| 10  | **Náhrobek kořene zůstává ve feedu. 💬 počítá živé odpovědi v celém vlákně.** Řazení podle `createdAt` kořene.          | Náhrobek z feedu skrýt; počítat jen přímé odpovědi; řadit podle poslední aktivity.               | Bez náhrobku ve feedu by se k vláknu nikdo nedostal. „💬 1“ u vlákna s dvaceti příspěvky klame. Řazení podle aktivity potřebuje další odvozený sloupec, o který PO nežádal.                                                                                                     |
| 11  | **`rootId` je u kořene `NULL`**, správnost hodnoty hlídá repository a unit test.                                        | Kořen má `rootId = id` a složený cizí klíč `(parentId, rootId) → (id, rootId)`, jako `PollVote`. | Složený klíč by správnost `rootId` hlídal v databázi, ale vyžaduje generovat `id` v aplikaci před insertem a backfill existujících řádků. `rootId` se zapisuje jen jednou a nikdy nemění, takže riziko je malé. Kdyby se quacky jednou přesouvaly, je potřeba se k tomu vrátit. |
