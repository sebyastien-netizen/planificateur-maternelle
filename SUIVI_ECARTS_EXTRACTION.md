# SUIVI DES ÉCARTS D'EXTRACTION
*Document maintenu par Marie — mis à jour à chaque session d'insertion*
*Dernière mise à jour : 28 août 2026*

---

## OBJECTIF

Ce document recense tous les écarts connus entre :
- Ce qui est dans les PDFs / tableaux HTML de vérification
- Ce qui est réellement inséré en base (`maternelle_regles` + `maternelle_creneaux`)

Il permet de ne jamais recréuser un écart déjà expliqué, et de planifier les corrections au bon moment.

---

## LÉGENDE STATUTS

| Statut | Signification |
|---|---|
| ✅ COMPLET | Extraction complète, aucun écart |
| ⚠️ ÉCART CONNU | Écart documenté, raison expliquée, correction planifiée |
| 🔴 À CORRIGER | Correction urgente avant d'aller plus loin |
| ⏳ EN ATTENTE | Méthode/période pas encore extraite |

---

## ACCÈS Vers l'écriture PS — Période 1

**Statut : ⚠️ ÉCART CONNU**

| Élément | HTML | Base | Écart |
|---|---|---|---|
| Règles total | 61 | 44 | −17 |
| Séquences 1–7 + 11 | 44 | 44 | ✅ |
| Séq 8 — Motricité fine | 10 | 0 | −10 |
| Séq 9 — Discrimination visuelle | 6 | 0 | −6 |
| Séq 10 — Alignement | 18 | 0 − mais présents en créneaux sans regle_id | −1 |

**Raison de l'écart :**
Les séquences 8, 9, 10 sont des pools d'activités autonomes (même logique que les pools MHM). Lors de l'insertion en session du 22 août 2026, elles ont été insérées directement dans `maternelle_creneaux` sans créer de `maternelle_regles` individuelles. 14 créneaux PS P1 n'ont pas de `regle_id`.

**Impact actuel :**
- Ces séances s'affichent dans le cahier journal ✅
- Pas de lien PDF ❌
- Pas de `type_dispositif` ❌
- Pas de progression traçable dans `progression.html` (futur) ❌

**Correction à planifier :**
Insérer les règles manquantes pour les séquences 8, 9, 10 avec les IDs `acces-ps-p1-r45` à `acces-ps-p1-r61`, puis mettre à jour les `regle_id` des créneaux correspondants. Utiliser `ACCES_PS_P1_verification_v4.html` comme source.

**Priorité :** Basse — après correction ateliers R1=R2 et extraction P2.

---

## ACCÈS Vers la phono GS — Période 1

**Statut : ⚠️ ÉCART CONNU**

| Élément | HTML | Base | Écart |
|---|---|---|---|
| Règles total | 51 extraites | 52 | −1 (sens inverse) |
| `type_dispositif` mappé | 51 | 52 | 1 règle sans mapping |

**Raison de l'écart :**
Une séance dans le HTML a une structure légèrement différente que le parser Python n'a pas détectée. La règle manquante est probablement dans une section SI TEMPS ou une évaluation avec une `div` imbriquée différemment.

**Impact actuel :**
- 1 règle sans `type_dispositif` ❌
- Affichage cahier journal non affecté ✅

**Correction à planifier :**
Identifier la règle sans `type_dispositif` :
```sql
SELECT id, description 
FROM maternelle_regles 
WHERE id LIKE 'phono-gs-p1-%' 
  AND type_dispositif IS NULL;
```
Puis UPDATE manuel selon le contenu de la description.

**Priorité :** Très basse — une seule règle, impact minimal.

---

## ACCÈS Vers l'écriture GS — Période 2

**Statut : ⚠️ ÉCART CONNU**

| Élément | HTML | Base | Écart |
|---|---|---|---|
| Règles total | 67 | 53 | −12 |
| `type_dispositif` mappé | 55 | 53 | 2 règles sans mapping |

**Raison de l'écart :**
12 règles non extraites par le parser — probablement des séances avec structure HTML différente (tableaux imbriqués, badges multiples). Les r56 à r67 n'ont pas été mappées.

**Impact actuel :**
- 2 règles sans `type_dispositif` ❌
- Affichage cahier journal non affecté ✅

**Correction à planifier :**
```sql
SELECT id, description 
FROM maternelle_regles 
WHERE id LIKE 'acces-gs-p2-%' 
  AND type_dispositif IS NULL;
```
Puis UPDATE manuel selon description.

**Priorité :** Basse.

---

## ACCÈS Vers l'écriture GS — Période 1

**Statut : ✅ COMPLET**

51 règles extraites = 51 en base. `type_dispositif` renseigné sur toutes.

---

## MHM MS/GS — Période 1

**Statut : ✅ COMPLET**

47 règles (29 dirigé + 18 autonome). `type_dispositif` renseigné sur toutes.
Note : pas de `semi-dirigé` en MHM — cohérent avec la méthode.

---

## MHM PS/MS — Période 1

**Statut : ✅ COMPLET**

34 règles (15 dirigé + 19 autonome). `type_dispositif` renseigné sur toutes.

---

## MÉTHODES NON ENCORE EXTRAITES

| Méthode | Périodes | Statut |
|---|---|---|
| ACCÈS Vers l'écriture GS | P3, P4, P5 | ⏳ En attente |
| ACCÈS Vers l'écriture PS | P2, P3, P4, P5 | ⏳ En attente |
| ACCÈS Vers la phono GS | P2, P3, P4, P5 | ⏳ En attente |
| MHM MS/GS | P2, P3, P4, P5 | ⏳ En attente |
| MHM PS/MS | P2, P3, P4, P5 | ⏳ En attente |
| ACCÈS Autour des livres TPS-PS | P1–P5 | ⏳ En attente |
| ACCÈS Autour des livres GS | P1–P5 | ⏳ En attente |
| ACCÈS Vers le temps maternelle | P1–P5 | ⏳ En attente |

---

## CORRECTION ATELIERS R1 ≠ R2 — P1

**Statut : 🔴 À CORRIGER**

**Raison :**
Lors de l'insertion des créneaux P1, la règle fondamentale (Rotation 1 = Rotation 2 avec groupes permutés, 4 groupes simultanés ENS + AUTO + ATSEM + AUTO) n'a pas été respectée. R1 et R2 contiennent des séances différentes sur plusieurs jours.

**Impact actuel :**
- Cahier journal affiche des séances incohérentes ❌
- Le moteur de proposition ne pourra pas raisonner correctement sur les ateliers ❌

**Correction à planifier :**
Analyse des créneaux ateliers S1-S6 P1, correction SQL créneau par créneau.

**Priorité :** Haute — prochaine étape après `type_dispositif`.

---

## HISTORIQUE DES CORRECTIONS

| Date | Action | Résultat |
|---|---|---|
| 28/08/2026 | Ajout colonne `statut` dans `maternelle_creneaux` | ✅ |
| 28/08/2026 | Ajout colonne `statut_planification` dans `maternelle_creneaux` | ✅ |
| 28/08/2026 | Ajout colonne `type_dispositif` dans `maternelle_regles` | ✅ |
| 28/08/2026 | UPDATE `type_dispositif` toutes méthodes P1 | ✅ |
