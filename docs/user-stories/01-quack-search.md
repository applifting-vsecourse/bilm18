# 01 — Vyhledávání ve feedu quacků

## Story

**Jako** přihlášený uživatel
**chci** napsat slovo nebo jméno autora a vidět jen quacky, které mu odpovídají,
**abych** našel příspěvek, který jsem viděl dřív, bez scrollování celým feedem.

## Proč

Uživatelé opakovaně píšou supportu, že nemůžou najít quack, který viděli minulý týden. Většinou si pamatují slovo z textu nebo kdo ho napsal.

Je to **experiment**: chceme ověřit, jestli lidi vyhledávání použijí. Proto co nejmenší verze. Měření použití řeší navazující story [02-quack-search-tracking.md](02-quack-search-tracking.md).

## Akceptační kritéria

- [ ] Psaní do pole okamžitě zúží seznam podle [pravidel shody](#pravidla-shody); všechny příklady z tabulky platí.
- [ ] Prázdné pole / samé mezery ukazuje celý feed.
- [ ] Žádná shoda → „No quacks match "…".“; prázdný feed bez hledání → původní text.
- [ ] Clear tlačítko je vidět jen s neprázdným polem, vymaže ho a vrátí fokus; Escape dělá totéž.
- [ ] Pole má viditelný `<label>`; Clear má `aria-label`; žádné stíny ani hardcoded barvy (DESIGN.md).
- [ ] Filtrovací logika je **čistá funkce** (např. `features/quack/lib/filterQuacks.ts`) s unit testy: velikost písmen, `@`, okolní mezery, prázdný výraz, shoda v `text` / `name` / `username`, žádná shoda.
- [ ] Testy chování stránky/komponenty ve stylu `QuackList.test.tsx`: prázdný stav hledání, Clear, Escape.
- [ ] Backend beze změny.
- [ ] `pnpm check-all` projde.

## Mimo rozsah

- Zvýraznění nalezeného textu ve výsledcích.
- Hledání po jednotlivých slovech, operátory, syntaxe typu `from:jan`.
- Filtrování podle data.
- Výraz v URL (`?q=`), sdílení odkazu na hledání.
- **Jakákoli změna backendu** (endpoint, Prisma dotaz). Až přibude stránkování feedu, musí se vyhledávání přesunout na server — to je samostatná práce.
- Měření použití → [02-quack-search-tracking.md](02-quack-search-tracking.md).

## Developer notes

### Kontext v kódu

- Stránka: `apps/frontend/src/routes/_ProtectedPages/quacks.tsx` (`h1` → `QuackForm` → `QuackList`).
- `GET /api/quacks` vrací **všechny** quacky bez stránkování (`QuackRepository.getQuacks()`), takže je frontend už má v paměti. **Filtruje se proto čistě na frontendu.**
- Každý quack má `text` a `user.name` + `user.username` (viz `quackSchemas.ts`, `QuackItem.tsx`).
- Před psaním UI přečti [`DESIGN.md`](../../DESIGN.md). `Input`, `Label`, `Button` už jsou v `src/components/ui/`.

### Pravidla shody

Jedno vyhledávací pole, shoda v **kterémkoli** z polí `text`, `user.name`, `user.username`.

- Bez ohledu na velikost písmen.
- Zadaný výraz se ořízne o okolní mezery; pak se hledá jako **jeden souvislý podřetězec** (fráze), ne po slovech.
- Úvodní `@` se ignoruje (`@BreadCritic` → hledá `BreadCritic`), protože username se v UI zobrazuje se zavináčem.
- Prázdný výraz (nebo jen mezery) = zobrazí se celý feed.
- Pořadí výsledků je stejné jako ve feedu (nejnovější nahoře).

Příklady proti seed datům:

| Výraz          | Výsledek                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| `SOURDOUGH`    | quack od The Bread Critic („Sourdough. Thrown by a child…“)                               |
| `@breadcritic` | všechny quacky uživatele `BreadCritic`                                                    |
| `bread critic` | totéž — shoda v `name` „The Bread Critic“                                                 |
| `  espresso  ` | quack „third espresso and i can hear colours now“                                         |
| `sky pond`     | **nic** — v textu je „sky just a very large and very shy pond“, fráze `sky pond` tam není |
| `` (prázdné)   | celý feed                                                                                 |

### UI a chování

- Pole je **mezi `QuackForm` a seznamem**.
- Viditelný label **„Search quacks“**, placeholder `e.g. duck or @BreadCritic`.
- Filtruje se **průběžně při psaní**, bez tlačítka „Search“.
- **Clear:** uvnitř pole vpravo ikona `X` (`lucide-react`) jako `Button variant="ghost" size="icon"` z kitu, `aria-label="Clear search"`.
  - Viditelné jen když pole není prázdné.
  - Klik vymaže pole, ukáže celý feed a **vrátí fokus do pole**.
  - Klávesa **Escape** v poli dělá totéž.
- **Prázdný výsledek:** jedna věta v `text-muted-foreground`: **No quacks match "duck".** (s tím, co uživatel napsal). Stávající „No quacks yet. Post the first one.“ zůstává jen pro opravdu prázdný feed.
- Stavy loading a error seznamu se chovají jako dnes.
- Výraz žije jen ve stavu stránky (`useState`) — po refreshi / odchodu ze stránky zmizí.
