# 0002 — Lajky jako tabulka `QuackLike`, počet se spočítá při čtení

## Status

Přijato (2026-11-24). Vzniklo při návrhu lajků (seminář 10), případy jsou v [`cases.md`](../../cases.md).

## Kontext

Product owner chce u každého quacku tlačítko na lajk a počet lajků. Každý může quack lajknout jen jednou a lajk zase vzít zpět. Z [`cases.md`](../../cases.md) plyne, co musí datový model unést:

1. **Jednou na člověka, i při souběhu** (I4, I5). Pět `PUT /api/quacks/:id/like` najednou od stejného uživatele dá počet 1. Hlídat to musí databáze, kontrola v kódu souběh nezachytí.
2. **`likedByMe`** (rozhodnutí 8, I3). Každý uživatel vidí, jestli quack lajknul on, takže se musí ukládat, kdo lajknul.
3. **Lajk jde vzít zpět a `DELETE` maže jen lajk přihlášeného uživatele** (I7, I9, E4).
4. **Lajky mizí s obsahem** (rozhodnutí 3 a 4, I14, I15). Z quacku, který se stane náhrobkem (ADR [0001](0001-smazany-quack-jako-nahrobek.md)), lajky zmizí. Po úplně smazaném quacku nezůstane osiřelý lajk.
5. **Počet a `likedByMe` všude, kde je quack**: ve feedu, v Mine i ve vlákně (rozhodnutí 10).

Podobné věci aplikace už řeší. `PollVote` hlídá „jeden hlas na člověka“ přes `@@unique([quackId, userId])`. Počet odpovědí (`replyCount`) se nikam neukládá, spočítá se při čtení přes Prisma `_count` ve stejném dotazu jako feed.

## Rozhodnutí

**Lajk je řádek v nové tabulce `quack_like` s primárním klíčem `(quackId, userId)`. Počet lajků se nikam neukládá, spočítá se při čtení.**

```prisma
model QuackLike {
  quack     Quack    @relation(fields: [quackId], references: [id], onDelete: Cascade)
  quackId   String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime @default(now())

  // One like per person per quack, enforced by the database.
  @@id([quackId, userId])
  @@index([userId])
  @@map("quack_like")
}
```

- **Lajk** je insert, který při konfliktu na primárním klíči nic neudělá (`INSERT … ON CONFLICT DO NOTHING` nebo `createMany({ skipDuplicates: true })`). Druhý i souběžný lajk tak skončí 200 a počet zůstane 1. Nesmí to být „najdi, a když není, vlož“: dva souběžné requesty by oba nic nenašly a jeden by spadl na unikátním klíči.
- **Odlajk** je `deleteMany({ where: { quackId, userId } })`, kde `userId` je vždy přihlášený uživatel ze session. Smazání ničeho není chyba (I8).
- **Počet a `likedByMe`** se čtou ve stejném dotazu jako quack: `_count: { select: { likes: true } }` a `likes: { where: { userId: viewerId }, select: { userId: true } }`. Stejně se dnes čte `replyCount` a hlas v anketě.
- **Náhrobek:** `QuackRepository.deleteQuack` ve větvi pro náhrobek smaže v téže transakci i lajky quacku, stejně jako dnes smaže anketu. Lajky odpovědí zůstávají. Na náhrobek lajk nejde přidat (service vrátí 404).
- **Úplné smazání** quacku nebo uživatele smaže lajky kaskádou (`onDelete: Cascade`).

Primární klíč je dvojice `(quackId, userId)`, ne samostatné `id`. Lajk nemá jinou identitu než „kdo a co“ a nikdo na něj neodkazuje. Index začínající `quackId` zároveň slouží pro počítání lajků quacku.

## Zvažované varianty

| Varianta                                                                                   | Proč zamítnuta                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tabulka `QuackLike` a navíc uložený `likeCount` na `Quack`**, měněný ve stejné transakci | Dva zdroje pravdy. Počítadlo se smí zvýšit, jen když insert opravdu vložil řádek, jinak se při souběhu (I5) rozjede. Každá cesta, která maže lajky nebo quacky (náhrobek, kaskáda, budoucí mazání účtu), ho musí hlídat. Kaskáda v databázi ho sama nesníží. Řeší výkon čtení, který při našem objemu není problém. Kdyby někdy byl, jde sloupec dopočítat později (viz Důsledky). |
| **Jen počítadlo `likeCount` na `Quack`**                                                   | Nevíme, kdo lajknul, takže nejde zajistit „jednou na člověka“ ani `likedByMe` a lajk nejde vzít zpět. Informaci o tom, kdo lajknul, už pak nejde zpětně získat.                                                                                                                                                                                                                    |
| **Samostatné `id` a `@@unique([quackId, userId])`** (jako `PollVote`)                      | Funguje stejně, jen přidává sloupec a index, které nic nepoužívá. U `PollVote` má `id` smysl, protože hlas se mění (jiná možnost). Lajk se nemění, jen vzniká a zaniká.                                                                                                                                                                                                            |
| **„Najdi, a když není, vlož“ v kódu bez unikátního klíče**                                 | Souběžné requesty (dvojklik, dvě záložky) projdou kontrolou oba a vzniknou dva lajky. Přesně tohle hlídá I5.                                                                                                                                                                                                                                                                       |
| **Lajky náhrobku nechat v DB a jen je nevracet**                                           | Porušuje „lajky mizí s obsahem“ (rozhodnutí 3). Skrytí by záviselo na tom, že na filtr nikdo nezapomene v každém dotazu.                                                                                                                                                                                                                                                           |

## Důsledky

**Pro zbytek aplikace:**

- **Každý dotaz, který vrací quacky** (feed `all` i `mine`, vlákno), musí načíst `_count.likes` a lajk přihlížejícího. Doménový `Quack`, `QuackResponseDto` a frontendové zod schéma dostanou `likeCount: number` a `likedByMe: boolean`.
- **Náhrobek** vrací `likeCount: 0` a `likedByMe: false`. Lajky v DB nemá, takže z dotazu to vyjde samo.
- **Mazání quacku** dostane do větve pro náhrobek další krok (`quackLike.deleteMany`). Platí pro to, co říká ADR 0001: každé další mazání quacků musí jít přes `deleteQuack`.
- **Mazání uživatelského účtu** (až vznikne) smaže jeho lajky kaskádou, nic dalšího se dělat nemusí.
- **Integrační testy** potřebují, aby `resetDatabase` mazal i `quack_like`. Maže všechny tabulky, takže to platí samo.

**Co se nejhůř vrací:**

- Prakticky nic. Přechod na uložené počítadlo je přidání sloupce a jeden `UPDATE quack q SET "likeCount" = (SELECT count(*) FROM quack_like l WHERE l."quackId" = q.id)`. Opačný směr by znamenal zrušit sloupec, na který mezitím začal spoléhat kód (třeba řazení podle lajků).
- Lajky smazaných quacků a náhrobků jsou pryč. Kdyby se později chtěla statistika „kolik lajků kdy padlo“, pro dřívější smazání už nebude z čeho.
