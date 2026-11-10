# Architecture Decision Records

Rozhodnutí o datovém modelu a struktuře aplikace, která se těžko vracejí nebo se dotýkají víc než jedné featury. Nový záznam dostane další číslo (`NNNN-kratky-nazev.md`) a řádek do tabulky níž.

| #                                           | Název                                                            | Status  | Shrnutí                                                                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-smazany-quack-jako-nahrobek.md) | Smazaný quack s odpověďmi se stane náhrobkem bez obsahu a autora | Přijato | Quack s odpověďmi se při smazání vyprázdní (`text`, `userId`, `mood` → `NULL`, `deletedAt`), aby odpovědi zůstaly a obsah opravdu zmizel. `Quack.text` a `user` jsou proto v celé aplikaci nullable. |
