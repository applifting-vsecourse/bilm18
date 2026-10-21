# 05 — Moderace: admin smaže jakýkoli quack

## Story

**Jako** admin
**chci** smazat jakýkoli quack, i cizí,
**abych** mohl odstranit urážlivý obsah, když ho autor sám smazat nechce.

## Proč

Někdo začal postovat nechutné quacky. Autor je nesmaže a dnes s tím nikdo nic nenadělá — mazat smí jen autor, admini výslovně taky ne (viz `deleteQuack` v `quacks.service.ts`).

Chceme **nejmenší možnou moderaci**: admin smí mazat cokoli, nic víc. Žádné nahlašování, historie ani nová role.

Role `admin` už existuje (`UserRole` v `schema.prisma`) a v seedu ji má jen účet **admin@example.com / adminpassword** (`@superadmin`).

## Akceptační kritéria

### Server (to, na čem záleží)

- [ ] `DELETE /api/quacks/:quackId` smaže quack, když je přihlášený uživatel **autor, nebo má roli `admin`**. Odpověď 204.
- [ ] Kdokoli jiný dostane u cizího quacku **403** a quack zůstane — i když request pošle přímo (Swagger, curl), ne přes UI.
- [ ] Nepřihlášený dostane **401**.
- [ ] Neexistující quack: **404** — pro autora i pro admina.
- [ ] Kdo maže a s jakou rolí, se bere **jen ze session** (`@User()`). V URL ani v body není žádné `userId` ani role.
- [ ] Kontrola je na serveru (v service, resp. zápisu v repository). Skrytí tlačítka v UI je jen pohodlí.
- [ ] Spolu s quackem zmizí i jeho anketa a hlasy (jako u mazání autorem).
- [ ] Swagger popis endpointu odpovídá novému chování (smí autor nebo admin; 403 pro ostatní).

### UI

- [ ] Admin vidí tlačítko Delete (koš) **u každého quacku** ve feedu, na záložce All i Mine.
- [ ] Ostatní vidí Delete jen u svých quacků, jako dnes.
- [ ] Když admin maže **cizí** quack, potvrzovací dialog zmíní autora, např. **„Delete @CaffeinatedDuck's quack?“**. U vlastního quacku zůstává „Delete this quack?“.
- [ ] Po smazání quack zmizí z feedu, chování po úspěchu i chybě je stejné jako dnes u autora.
- [ ] Záložka **Mine** ukazuje adminovi dál jen jeho vlastní quacky.

### Ruční ověření (seed data)

- [ ] **admin@example.com** smaže quack od **CaffeinatedDuck** → zmizí.
- [ ] **deepduckthoughts@example.com** u quacku od CaffeinatedDuck koš nevidí a přes Swagger dostane 403.
- [ ] **pondadmin@example.com** („Pond Admin“) má „admin“ jen ve jméně, roli má `user` — taky 403. Admina pozná server podle role ze session, ne podle jména.
- [ ] **caffeinatedduck@example.com** dál smaže svůj vlastní quack.

### E2E test

- [ ] V repu je Playwright a příkaz, který spustí E2E testy **lokálně proti běžící appce** (seedovaná DB). CI se nemění.
- [ ] Test **„admin can delete someone else's quack“**: CaffeinatedDuck vytvoří quack s unikátním textem (`Spam ${Date.now()}`), admin ho ve feedu najde podle textu, smaže přes UI a quack zmizí. Seedové quacky se nemažou.
- [ ] Test **„nobody can delete someone else's quack“**: běžný uživatel (DeepDuckThoughts) dostane na cizí quack 403 a quack zůstane.
- [ ] Když se v service kontrola admina vypne, první test **spadne** (ověřeno ručně).

### Kvalita

- [ ] Unit testy service pokrývají: admin smaže cizí quack; cizí `user` dostane `ForbiddenException`; 404 i pro admina.
- [ ] Testy UI pokrývají: admin vidí Delete u cizího quacku; dialog zmíní autora.
- [ ] Žádné nové stíny, vnořené karty ani hardcoded barvy ([DESIGN.md](../../DESIGN.md)).
- [ ] `pnpm lint` a `pnpm check-all` projdou.
- [ ] Nové pravidlo v [CLAUDE.md](../../CLAUDE.md) z práce na moderaci.

## Mimo rozsah

- Role `moderator`.
- Stránka Stats pro admina.
- Nahlášení quacku, fronta k moderaci, důvod smazání.
- Oznámení autorovi, že mu admin smazal quack.
- Audit log / historie smazaných, obnovení smazaného (soft delete).
- Blokace nebo ban uživatele.
- Mazání více quacků najednou.
- E2E testy v CI.
