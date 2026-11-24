# Architecture Decision Records

Rozhodnutí o datovém modelu a struktuře aplikace, která se těžko vracejí nebo se dotýkají víc než jedné featury. Nový záznam dostane další číslo (`NNNN-kratky-nazev.md`) a řádek do tabulky níž.

| #                                           | Název                                                            | Status  | Shrnutí                                                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-smazany-quack-jako-nahrobek.md) | Smazaný quack s odpověďmi se stane náhrobkem bez obsahu a autora | Přijato | Quack s odpověďmi se při smazání vyprázdní (`text`, `userId`, `mood` → `NULL`, `deletedAt`), aby odpovědi zůstaly a obsah opravdu zmizel. `Quack.text` a `user` jsou proto v celé aplikaci nullable.                  |
| [0002](0002-lajky.md)                       | Lajky jako tabulka `QuackLike`, počet se spočítá při čtení       | Přijato | Lajk je řádek v `quack_like` s primárním klíčem `(quackId, userId)`, takže jednou na člověka hlídá databáze i při souběhu. `likeCount` se neukládá, počítá se při čtení jako `replyCount`. Náhrobek své lajky ztratí. |
