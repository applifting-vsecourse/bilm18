# 07 — Lajky na quacky: případy (cases)

Tento soubor je **specifikace pro testy**. Z každého případu vznikne jeden test; testy se commitnou jako `test: likes (red)` a implementace se jim přizpůsobí, ne naopak.

## Zadání od product ownera

> Lidi chtějí dát najevo, že se jim quack líbí, aniž by museli odpovídat. Chci u každého quacku tlačítko na lajk a počet lajků. Každý může quack lajknout jen jednou a lajk zase vzít zpět.

## Rozhodnutí

Všechny otázky jsou uzavřené. Co tu není, je mimo rozsah (viz konec).

| #   | Otázka                                                 | Rozhodnutí                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Smím lajknout svůj vlastní quack?                      | **Ano.** Žádné zvláštní pravidlo.                                                                                                                                                                                                                                                            |
| 2   | Jdou lajkovat odpovědi?                                | **Ano.** Odpověď je taky `Quack`, lajk funguje stejně. Každý quack má svůj vlastní počet; lajk na odpověď nezvedá počet kořene.                                                                                                                                                              |
| 3   | Smazaný quack (náhrobek, ADR 0001)?                    | **Lajky zmizí s obsahem** a náhrobek lajknout ani odlajknout nejde (**404**, stejně jako neexistující quack). Náhrobek v UI nemá tlačítko ani počet; v API má `likeCount: 0`, `likedByMe: false`.                                                                                            |
| 4   | Quack smazaný úplně (bez odpovědí)?                    | Jeho lajky zmizí s ním. V databázi nezůstane žádný osiřelý lajk.                                                                                                                                                                                                                             |
| 5   | Lajknu podruhé / odlajknu nelajknuté?                  | **Nic se nezmění, 200.** `PUT` i `DELETE` jsou idempotentní a vrací aktuální stav `{ likeCount, likedByMe }`.                                                                                                                                                                                |
| 6   | Nepřihlášený návštěvník?                               | **401** na lajk i odlajk. (Celá aplikace je za přihlášením, feed nepřihlášený nevidí.)                                                                                                                                                                                                       |
| 7   | Má admin nějakou výsadu?                               | **Ne.** Admin lajkuje jako kdokoli jiný a jeho lajk se počítá jednou. Cizí lajk odebrat nemůže: `DELETE` maže vždy jen lajk přihlášeného uživatele.                                                                                                                                          |
| 8   | Vidím, že jsem quack lajknul?                          | **Ano.** Tlačítko má dva stavy: nelajknuté (obrys srdce, `aria-label="Like"`, `aria-pressed="false"`) a lajknuté (vyplněné srdce, `aria-label="Unlike"`, `aria-pressed="true"`). Stav přežije reload.                                                                                        |
| 9   | Ukazuje se počet i při 0?                              | **Ano**, vedle tlačítka je vždy číslo, i `0`.                                                                                                                                                                                                                                                |
| 10  | Kde se lajky ukazují?                                  | **Všude, kde je quack:** feed All, záložka Mine a stránka vlákna (kořen i odpovědi).                                                                                                                                                                                                         |
| 11  | Dva současné lajky od stejného člověka?                | Počet je **1**. Hlídá to databáze, ne jen kód (souběžné requesty, dvojklik, dvě záložky).                                                                                                                                                                                                    |
| 12  | Mění lajk pořadí feedu?                                | **Ne.** Pořadí zůstává podle `createdAt`.                                                                                                                                                                                                                                                    |
| 13  | Co když lajk selže (např. 404, quack mezitím smazaný)? | **Vrátí se zpět s hláškou.** UI ukáže lajk hned (stejně jako hlas v anketě, `useVote`); když request selže, tlačítko i počet se vrátí do původního stavu, objeví se toast „Your like didn't go through. Try again.“ a feed se znovu načte (smazaný quack se ukáže jako náhrobek nebo zmizí). |

## API (kontrakt pro testy)

- **`PUT /api/quacks/:quackId/like`** — lajkne quack za přihlášeného uživatele. Vrací `200 { likeCount: number, likedByMe: true }`.
- **`DELETE /api/quacks/:quackId/like`** — odebere lajk přihlášeného uživatele. Vrací `200 { likeCount: number, likedByMe: false }`.
- Obě: **401** nepřihlášený, **404 „Quack not found“** neexistující quack nebo náhrobek.
- **`GET /api/quacks`** (`scope=all` i `scope=mine`) a **`GET /api/quacks/:quackId/thread`**: každý quack má navíc `likeCount: number` a `likedByMe: boolean` (z pohledu přihlášeného uživatele).

Uživatel je vždy ze session (`@User()`), nikdy z URL ani z těla.

## Případy

Jména a texty jsou ze seedu (`apps/backend/src/scripts/seed/seed/seed-database.ts`): **CaffeinatedDuck**, **BreadCritic**, **DeepDuckThoughts**, admin **superadmin**; quack „just spilled coffee on my keyboard“ a jeho odpovědi. Integrační a E2E testy si data, která mění, vytvářejí samy.

### A) Pravidla → unit testy

**Backend, `QuacksService` (repository namockované):**

- **R1 — lajk na živý quack projde**
  Given živý quack od CaffeinatedDuck
  When BreadCritic ho lajkne
  Then service zavolá uložení lajku pro (quack, BreadCritic) a vrátí stav z repository.
- **R2 — vlastní quack jde lajknout**
  Given živý quack od CaffeinatedDuck
  When CaffeinatedDuck ho lajkne
  Then service lajk uloží (žádná `ForbiddenException`).
- **R3 — neexistující quack → 404**
  Given quack s id `does-not-exist` neexistuje
  When kdokoli lajkne nebo odlajkne
  Then service vyhodí `NotFoundException` a nic neukládá ani nemaže.
- **R4 — náhrobek → 404**
  Given quack s `deletedAt` (náhrobek)
  When kdokoli lajkne nebo odlajkne
  Then service vyhodí `NotFoundException` a nic neukládá ani nemaže.
- **R5 — odlajk maže jen můj lajk**
  Given quack lajknutý BreadCriticem
  When superadmin (role `admin`) zavolá odlajk
  Then service maže lajk pro (quack, superadmin), ne lajk BreadCritica.
- **R6 — admin nemá výsadu** (per-role test)
  Given živý quack
  When ho lajkne uživatel s rolí `user` a uživatel s rolí `admin`
  Then oba projdou stejnou cestou (jeden lajk za každého).

Že smazání quacku odstraní i jeho lajky, unit test s namockovaným repository ověřit neumí; hlídají to integrační testy I14 a I15 proti databázi.

**Frontend, `features/quack/lib/toggleLike.ts` (čistá funkce pro okamžitou změnu v UI):**

- **R7 — lajk** `{ likeCount: 3, likedByMe: false }` → `{ likeCount: 4, likedByMe: true }`.
- **R8 — odlajk** `{ likeCount: 1, likedByMe: true }` → `{ likeCount: 0, likedByMe: false }`.
- **R9 — nikdy pod nulu** `{ likeCount: 0, likedByMe: true }` (nekonzistentní data) → `{ likeCount: 0, likedByMe: false }`.

**Frontend komponenta `LikeButton`:**

- **R10 — nelajknutý stav**: s `{ likeCount: 0, likedByMe: false }` vykreslí tlačítko `Like` s `aria-pressed="false"` a číslo `0`.
- **R11 — lajknutý stav**: s `{ likeCount: 2, likedByMe: true }` vykreslí tlačítko `Unlike` s `aria-pressed="true"` a číslo `2`.
- **R12 — klik volá `onToggle`**: klik na tlačítko zavolá `onToggle` jednou (komponenta je controlled).
- **R13 — náhrobek nemá lajk**: řádek „This quack was deleted“ nemá tlačítko Like ani počet.

**Frontend hook `features/quack/hooks/useToggleLike.ts` (API namockované, vzor `useVote`):**

- **R14 — lajk je vidět hned**
  Given ve feedu je quack s `{ likeCount: 0, likedByMe: false }` a server ještě neodpověděl
  When uživatel lajkne
  Then feed ukazuje `{ likeCount: 1, likedByMe: true }` dřív, než request doběhne.
- **R15 — selhání vrátí stav a řekne to**
  Given quack s `{ likeCount: 0, likedByMe: false }`
  When lajk selže (server vrátí 404, quack byl mezitím smazaný)
  Then feed je zpět na `{ likeCount: 0, likedByMe: false }` a objeví se toast „Your like didn't go through. Try again.“
- **R16 — po odpovědi se načtou skutečná čísla**
  When lajk doběhne (úspěšně i neúspěšně)
  Then se feed znovu načte ze serveru (lajky ostatních, smazaný quack jako náhrobek).

### B) Chování API → integrační testy (`*.int-spec.ts`, testovací databáze)

- **I1 — nepřihlášený**
  Given quack od CaffeinatedDuck s 0 lajky
  When nepřihlášený pošle `PUT` a `DELETE /api/quacks/:id/like`
  Then oba vrátí **401** a quack má dál 0 lajků.
- **I2 — první lajk**
  Given quack od CaffeinatedDuck s 0 lajky
  When BreadCritic pošle `PUT …/like`
  Then **200** `{ likeCount: 1, likedByMe: true }`.
- **I3 — lajk je vidět ve feedu, z pohledu každého jinak**
  Given BreadCritic quack lajknul (I2)
  When BreadCritic a DeepDuckThoughts načtou `GET /api/quacks`
  Then oba vidí u quacku `likeCount: 1`; BreadCritic `likedByMe: true`, DeepDuckThoughts `likedByMe: false`.
- **I4 — jen jednou**
  Given BreadCritic quack lajknul
  When pošle `PUT …/like` znovu
  Then **200** `{ likeCount: 1, likedByMe: true }`.
- **I5 — souběžné lajky stejného člověka**
  Given quack s 0 lajky
  When BreadCritic pošle 5× `PUT …/like` najednou (`Promise.all`)
  Then všechny vrátí 200 a quack má `likeCount: 1` (v tabulce lajků je pro tu dvojici právě jeden řádek).
- **I6 — víc lidí**
  Given quack s 0 lajky
  When ho lajkne BreadCritic, DeepDuckThoughts a superadmin
  Then `likeCount: 3`.
- **I7 — odlajk**
  Given quack lajknutý BreadCriticem a DeepDuckThoughts (2)
  When BreadCritic pošle `DELETE …/like`
  Then **200** `{ likeCount: 1, likedByMe: false }` a DeepDuckThoughts má dál `likedByMe: true`.
- **I8 — odlajk bez lajku**
  Given quack, který BreadCritic nelajknul, s 1 lajkem od DeepDuckThoughts
  When BreadCritic pošle `DELETE …/like`
  Then **200** `{ likeCount: 1, likedByMe: false }`.
- **I9 — admin neodebere cizí lajk**
  Given quack lajknutý BreadCriticem
  When superadmin pošle `DELETE …/like`
  Then **200** `{ likeCount: 1, likedByMe: false }` a BreadCritic má dál `likedByMe: true`.
- **I10 — vlastní quack**
  Given quack od CaffeinatedDuck
  When CaffeinatedDuck pošle `PUT …/like`
  Then **200** `{ likeCount: 1, likedByMe: true }`.
- **I11 — lajk na odpověď**
  Given quack od CaffeinatedDuck s odpovědí od BreadCritic
  When DeepDuckThoughts lajkne odpověď
  Then `GET /api/quacks/:rootId/thread` vrátí odpověď s `likeCount: 1, likedByMe: true` a kořen s `likeCount: 0`.
- **I12 — Mine má lajky**
  Given quack od CaffeinatedDuck lajknutý BreadCriticem
  When CaffeinatedDuck načte `GET /api/quacks?scope=mine`
  Then quack má `likeCount: 1, likedByMe: false`.
- **I13 — neexistující quack**
  When BreadCritic pošle `PUT` nebo `DELETE /api/quacks/does-not-exist/like`
  Then **404**.
- **I14 — náhrobek: lajky zmizí a nejde lajknout**
  Given quack od CaffeinatedDuck s odpovědí od BreadCritic; quack lajkli BreadCritic a DeepDuckThoughts, odpověď lajknul DeepDuckThoughts
  When CaffeinatedDuck quack smaže (stane se náhrobkem)
  Then vlákno vrátí náhrobek s `likeCount: 0, likedByMe: false`, v databázi nejsou žádné lajky náhrobku, odpověď má dál `likeCount: 1`, a `PUT` i `DELETE …/like` na náhrobek vrátí **404**.
- **I15 — úplně smazaný quack nenechá lajky**
  Given quack bez odpovědí lajknutý BreadCriticem
  When ho autor smaže
  Then v databázi nezůstane žádný lajk s jeho id a `PUT …/like` vrátí **404**.

### C) End-to-end → Playwright (`apps/frontend/e2e/likes.e2e.ts`)

Testy si vytvoří vlastní quack s unikátním textem (`Like me ${Date.now()}`), seed nemění.

- **E1 — lajk a odlajk, přežije reload**
  Given CaffeinatedDuck je přihlášený a napíše nový quack; u něj je `Like` a `0`
  When klikne na `Like`
  Then tlačítko je `Unlike` (`aria-pressed="true"`) a počet `1`;
  after reload stránky je to pořád `Unlike` a `1`;
  When klikne na `Unlike`
  Then je zpět `Like` a `0`.
- **E2 — dva lidé, každý vidí svůj stav**
  Given CaffeinatedDuck napíše quack a lajkne ho (1)
  When se přihlásí BreadCritic a otevře feed
  Then u quacku vidí `Like` (ne `Unlike`) a `1`;
  When klikne na `Like`
  Then vidí `Unlike` a `2`.
- **E3 — jen jednou, i přes API** (hlídá, že pravidlo je na serveru)
  Given BreadCritic quack lajknul v UI
  When pošle přes `page.request` znovu `PUT /api/quacks/:id/like`
  Then odpověď je `likeCount: 1` a po reloadu UI ukazuje `1`.
  Kdyby se v databázi vypnula unikátnost lajku a v service kontrola, test **spadne**.
- **E4 — admin neodebere cizí lajk** (hlídá, že `DELETE` maže jen lajk přihlášeného)
  Given CaffeinatedDuck napíše quack a BreadCritic ho v UI lajkne (`Unlike`, `1`)
  When superadmin pošle přes `page.request` `DELETE /api/quacks/:id/like`
  Then odpověď je `{ likeCount: 1, likedByMe: false }` a BreadCritic po reloadu pořád vidí `Unlike` a `1`.
  Kdyby `DELETE` mazal lajky quacku bez ohledu na uživatele, test **spadne**.

## Mimo rozsah

- Seznam lidí, kteří quack lajkli (bonus „Who liked it“).
- Řazení nebo filtrování podle lajků.
- Notifikace „někdo ti lajknul quack“.
- Jiné reakce než lajk (emoji).
- Lajky při mazání uživatelského účtu (mazání účtu není postavené, ADR 0001).
