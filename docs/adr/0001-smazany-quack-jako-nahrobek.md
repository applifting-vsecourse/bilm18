# 0001 — Smazaný quack s odpověďmi se stane náhrobkem bez obsahu a autora

## Status

Přijato (2026-11-10). Vzniklo při návrhu story [06 — Odpovědi na quacky](../user-stories/06-quack-replies.md), rozhodnutí 4, 5, 7 a 6.

## Kontext

Na quack jde nově odpovídat. Odpověď je `Quack` s `parentId`, vlákno má libovolnou hloubku. Product owner chce dvě věci, které jdou proti sobě:

1. **Odpovědi patří lidem, kteří je napsali.** Když autor smaže quack, na který už někdo odpověděl, odpovědi nesmí zmizet.
2. **Smazaný obsah musí opravdu zmizet**, z aplikace i z databáze.

Dosud mazání quacku vždy fyzicky smazalo řádek (`QuackRepository.deleteQuack`) a kaskádou i anketu a hlasy. Story [05](../user-stories/05-quack-moderation.md) výslovně vyřadila soft delete a obnovu smazaného. Každý `Quack` měl vždy `text` a `user`, a na tom stojí veškerý kód, který quacky čte.

Pokud se řádek s odpověďmi smaže, odpovědi buď zmizí s ním (porušení bodu 1), nebo ztratí rodiče a vlákno se rozpadne. Pokud řádek zůstane celý, poruší se bod 2.

## Rozhodnutí

**Quack bez odpovědí se dál maže fyzicky. Quack s odpověďmi se stane náhrobkem**: řádek zůstane, ale `text`, `userId` a `mood` se nastaví na `NULL`, nastaví se `deletedAt` a anketa i hlasy se smažou. Náhrobek nemá autora, i když maže admin.

- **Úklid nahoru:** když zmizí poslední odpověď pod náhrobkem, smaže se i náhrobek, a tak dál nahoru po vlákně. Invariant: každý náhrobek má aspoň jednu živou odpověď.
- **Databáze hlídá tvar řádku** CHECK constraintem `quack_tombstone_check`: buď `deletedAt IS NULL` a `text` i `userId` jsou vyplněné, nebo `deletedAt IS NOT NULL` a `text`, `userId`, `mood` jsou `NULL`. Polovičatý stav nejde uložit.
- **Databáze nesmaže rodiče, pod kterým visí odpověď:** vztahy `parent` a `root` mají `onDelete: NoAction`.
- **`Quack.user` zůstává `onDelete: Cascade`.** Mazání účtu aplikace nemá. Kdo ho bude stavět, musí quacky uživatele s cizími odpověďmi nejdřív převést na náhrobky. Jinak smazání účtu na cizím klíči selže, a to je záměr: lepší chyba než potichu smazané cizí odpovědi.

Náhrobek není soft delete ve smyslu story 05: obsah ani autora nejde obnovit, protože v databázi nejsou.

## Zvažované varianty

| Varianta                                                                             | Proč zamítnuta                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vždy fyzicky smazat a odpovědím nastavit `parentId = NULL`** (`onDelete: SetNull`) | Vlákno se nevratně rozpadne. Odpovědi na smazaný kořen se objeví ve feedu jako samostatné quacky bez kontextu, tedy přesně ten zmatek, který feature řeší. |
| **Vždy fyzicky smazat i s odpověďmi** (`onDelete: Cascade`)                          | Přímo porušuje požadavek, že odpovědi patří svým autorům.                                                                                                  |
| **Náhrobek vždy, i bez odpovědí**                                                    | Zaplní feed prázdnými řádky „Tento quack byl smazán“ tam, kde nebylo co zachovat. Mění chování mazání pro všechny quacky, ne jen pro ty s odpověďmi.       |
| **Náhrobek se zachovaným autorem** („smazaný quack od @X“)                           | Když maže admin, text tvrdí nepravdu. Navíc prozrazuje, že X do vlákna psal, a to jde proti „obsah musí opravdu zmizet“.                                   |
| **Autor zůstane v DB, API ho jen nevrací**                                           | Data dál leží v databázi. Skrytí závisí na tom, že na něj nikdo nezapomene v mapperu.                                                                      |
| **Soft delete (`deletedAt`), obsah zůstane kvůli obnově**                            | Porušuje „obsah musí opravdu zmizet“. Story 05 obnovu výslovně vyřadila.                                                                                   |
| **Náhrobek poznaný jen podle `text IS NULL`, bez `deletedAt`**                       | Skrytý význam, který se rozbije, až přibude quack bez textu (třeba jen s obrázkem).                                                                        |
| **Při smazání účtu `Quack.user` → `SetNull`**                                        | Text quacků smazaného uživatele by zůstal v DB bez autora, což je přímé porušení „obsah musí opravdu zmizet“.                                              |

## Důsledky

**Pro zbytek aplikace:**

- **`Quack.text`, `Quack.userId` (`user`) a `Quack.mood` jsou nullable.** Platí to pro Prisma model, doménový `Quack`, response DTO i frontendové zod schéma. Kód, který quack čte, musí počítat s náhrobkem. Dnes konkrétně:
  - `features/quack/lib/filterQuacks.ts` volá `quack.user.name.toLowerCase()` a na náhrobku ve feedu by spadl. Náhrobky musí vyhledávání přeskočit.
  - `QuackItem.tsx` vykresluje `quack.text` a autora, takže náhrobek potřebuje vlastní vykreslení.
  - Kontrola vlastnictví v `QuacksService` (`userId === user.id`) náhrobek nikdy nepustí, ale má vracet 404, ne 403.
- **Mazání quacku není jeden `delete`**, ale transakce se dvěma větvemi a úklidem nahoru. Každá další feature, která maže quacky (hromadné mazání, mazání účtu, retence), musí jít přes stejnou logiku v repository, ne přímo přes `prisma.quack.delete`.
- **Nové features na `Quack`** (reakce, záložky, notifikace, statistiky…) musí rozhodnout, co dělají s náhrobkem. Typicky ho filtrují přes `deletedAt: null` a na náhrobek nejde nic přidat.
- **Mazání uživatelského účtu** je zablokované cizím klíčem, dokud se neimplementuje převod jeho quacků na náhrobky.
- **Statistiky nad tabulkou `quack`** musí náhrobky vyřadit (`WHERE "deletedAt" IS NULL`).

**Co se nejhůř vrací:**

- Po prvním náhrobku v produkci nejde vrátit `text NOT NULL` ani `userId NOT NULL` bez smazání náhrobků, a tím i rozpadu vláken.
- Obsah a autor smazaných quacků jsou pryč. Kdyby se později chtěla obnova nebo audit smazaného, pro dřívější smazání už nebude z čeho.
