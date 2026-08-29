# SQL_SCHEMA.md — Planificateur Maternelle
*Référence technique Supabase — à charger avant tout INSERT/ALTER*
*Dernière mise à jour : 28 août 2026*

---

## IDENTIFIANTS FIXES

```
SUPABASE_URL     : https://wqsprjlocuhandhvpytx.supabase.co
UUID enseignante : 6c1b1768-457b-4777-b1d9-a309f2fe2cef
Période 1 UUID   : c84c138a-60ac-43a1-afaf-cec696313b85
Période 2 UUID   : 9b730f79-55ab-404f-b810-d2ed80cc7484
Période 3 UUID   : 6cc0d611-5bb1-4abb-b966-c50c306ab260
Période 4 UUID   : 13c7d322-e243-4e60-b894-56417f97f143
Période 5 UUID   : 85b9c5b7-e68f-4bd9-9b59-10ea088a0a9c
```

---

## SEMAINES P1

| N° | UUID | Date lundi |
|---|---|---|
| S1 | a4338c80-ee36-4b56-92a9-4eacca4c096a | 2026-08-31 |
| S2 | 1710aaea-db55-4f55-bf75-dbd5258ead88 | 2026-09-07 |
| S3 | f7c36cd8-3a6e-4317-962c-5d8edc16a888 | 2026-09-14 |
| S4 | 9b0b5d89-55e3-41f4-bda4-6a3fd89c0eb4 | 2026-09-21 |
| S5 | a8eff5fd-aa1d-4260-bb46-ddbe2c442d91 | 2026-09-28 |
| S6 | 91832461-1a4a-431f-9b04-0659588567a7 | 2026-10-05 |
| S7 | 047ff3bd-d389-48ff-8d2c-7e21fb1a14a7 | 2026-10-12 |

## SEMAINES P2

| N° | UUID | Date lundi |
|---|---|---|
| S1 | 10e12f2c-aeec-462d-812c-8c9384412480 | 2026-11-02 |
| S2 | 9760f7f7-1f6f-4e15-9910-5310310772e1 | 2026-11-09 |
| S3 | 860c8000-3ba4-4d0e-a177-45613455cb0e | 2026-11-16 |
| S4 | 24e624e0-23ca-455d-8f5f-b4a9f00a9395 | 2026-11-23 |
| S5 | 268c5794-6ee6-4187-b943-72d201682501 | 2026-11-30 |
| S6 | 2b736f68-1bf3-473e-827b-c929b8a3807d | 2026-12-07 |
| S7 | a739fa23-df85-474f-8567-1273e189ca39 | 2026-12-14 |

---

## TABLE : maternelle_sequences

### Colonnes
| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| id | text | NO | — (string explicite obligatoire) |
| source | text | YES | — |
| titre | text | YES | — |
| niveau | text | YES | 'GS' ou 'PS' |
| periode | integer | YES | 1, 2, 3, 4 ou 5 (entier — pas 'P1') |
| ordre | integer | YES | — |
| description | text | YES | — |
| pdf_fichier | text | YES | URL OneDrive |
| pdf_page_debut | integer | YES | — |
| pdf_page_fin | integer | YES | — |

### ⚠️ Gotchas
- `periode` = **entier** (1, 2, 3…) — jamais `'P1'`, `'P2'` etc.
- `id` = string explicite obligatoire (ex: `'acces-gs-p1-seq-01'`) — pas d'auto-génération

### Exemple INSERT
```sql
INSERT INTO maternelle_sequences
  (id, source, titre, niveau, periode, ordre, description, pdf_fichier, pdf_page_debut, pdf_page_fin)
VALUES
  ('acces-gs-p1-seq-01', 'ACCÈS Vers l''écriture GS P1', 'L''alphabet en capitales', 'GS', 1, 1,
   'Description de la séquence.', 'https://1drv.ms/...', 1, 5);
```

---

## TABLE : maternelle_regles

### Colonnes
| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| id | text | NO | — (string explicite obligatoire) |
| source | text | YES | — |
| domaine_id | text | YES | FK maternelle_domaines |
| sous_domaine_id | text | YES | FK maternelle_sous_domaines |
| periode | integer | YES | 1, 2, 3, 4 ou 5 (entier) |
| niveau | text | YES | 'GS' ou 'PS' |
| frequence_type | text | YES | 'ponctuel', 'hebdomadaire'… |
| frequence_valeur | integer | YES | — |
| description | text | YES | — |
| created_at | timestamptz | NO | now() |
| jour_mhm | text | YES | MHM uniquement |
| est_introduction | boolean | YES | false |
| semaine_mhm | integer | YES | MHM uniquement |
| sequence_id | text | YES | FK maternelle_sequences |
| page_pdf | integer | YES | — |
| competence_id | text | YES | FK maternelle_competences |
| ordre_sequence | integer | YES | — |
| type_dispositif | text | YES | 'dirigé', 'semi-dirigé', 'autonome' |
| exclu_marie | boolean | YES | false par défaut — true = jamais proposé par Marie |

### ⚠️ Gotchas
- `id` = string explicite obligatoire (ex: `'acces-gs-p1-r01'`) — pas d'auto-génération
- `periode` = **entier** (1, 2, 3…) — jamais `'P1'`, `'P2'` etc.
- **PAS de colonnes** `role`, `heure_debut`, `heure_fin`, `moment` — ces colonnes sont dans `maternelle_creneaux`
- `exclu_marie = true` → séance hors périmètre ENS (ex: remplaçant lundi) — visible encyclopédie, jamais proposée par Marie
- RLS activé — nécessite token utilisateur ou politique lecture publique

### Exemple INSERT
```sql
INSERT INTO maternelle_regles
  (id, source, niveau, periode, description, frequence_type, frequence_valeur, sequence_id, ordre_sequence, page_pdf)
VALUES
  ('acces-gs-p1-r01', 'ACCÈS Vers l''écriture GS P1', 'GS', 1,
   'Description de la séance.', 'ponctuel', NULL, 'acces-gs-p1-seq-01', 1, 26);
```

---

## TABLE : maternelle_creneaux

### Colonnes
| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() — **auto-généré** |
| user_id | uuid | YES | UUID enseignante |
| semaine_id | uuid | YES | FK maternelle_semaines |
| jour | text | YES | 'mardi', 'jeudi', 'vendredi' |
| heure_debut | time | YES | ex: '08:50' |
| heure_fin | time | YES | ex: '09:20' |
| moment | text | YES | voir valeurs acceptées ci-dessous |
| groupe | text | YES | NULL généralement |
| role | text | YES | 'ENS', 'ATSEM', 'AUTO' |
| notes | text | YES | — |
| lien_programme | text | YES | — |
| created_at | timestamptz | NO | now() |
| activite | text | YES | description courte de l'activité |
| regle_id | text | YES | FK maternelle_regles |
| periode | text | YES | **'matin'** ou **'aprem'** — contrainte CHECK |
| type | text | YES | 'fixe' ou 'variable' |
| titre_fixe | text | YES | ex: 'Comptines PS' pour créneaux fixes |
| niveau | text | YES | 'GS' ou 'PS' |

### ⚠️ Gotchas
- `id` = **auto-généré** via `gen_random_uuid()` — ne pas fournir dans INSERT
- `periode` = **text** (`'matin'` ou `'aprem'`) — contrainte CHECK stricte
- `periode` ≠ numéro de période scolaire — c'est le moment de la journée
- RLS activé — nécessite token utilisateur

### Valeurs acceptées pour `moment`
```
'Accueil'
'Rituels'
'Comptines PS'
'Ateliers rotation 1'
'Ateliers rotation 2'
'Rituels maths GS'
'Motricité'
'Récréation'
'Regroupement PS'
'Écriture GS'
'Sieste PS'
'Réveil PS'
'Phonologie'
'Maths'
'Sciences / Découverte'
'Anglais / Arts'
```

### Exemple INSERT
```sql
INSERT INTO maternelle_creneaux
  (user_id, semaine_id, jour, heure_debut, heure_fin, moment,
   groupe, role, activite, notes, lien_programme, regle_id, periode, type, titre_fixe, niveau)
VALUES
  ('6c1b1768-457b-4777-b1d9-a309f2fe2cef',
   'a4338c80-ee36-4b56-92a9-4eacca4c096a',
   'mardi', '08:50', '09:20', 'Ateliers rotation 1',
   NULL, 'ATSEM', 'Avec mes mains — Produire des traces',
   NULL, NULL, 'acces-ps-p1-r01', 'matin', 'variable', NULL, 'PS');
```

---

## TABLE : maternelle_periodes

### Colonnes
| Colonne | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| nom | text | YES |
| date_debut | date | YES |
| date_fin | date | YES |

### ⚠️ Gotchas
- RLS activé — politique lecture publique créée le 27/08/2026
- 5 périodes en base — ne pas insérer de doublons (vérifier avant INSERT)

---

## TABLE : maternelle_semaines

### Colonnes
| Colonne | Type | Nullable | Défaut |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| periode_id | uuid | YES | FK maternelle_periodes |
| numero_semaine | integer | YES | 1 à 7 |
| date_lundi | date | YES | — |
| a_mardi | boolean | YES | true par défaut |

### ⚠️ Gotchas
- RLS activé — politique lecture publique créée le 27/08/2026
- `a_mardi` = true par défaut → à mettre à jour pour les mardis de décharge

---

## POLITIQUES RLS EN PLACE (lecture publique)

Tables avec politique `USING (true)` pour SELECT sans authentification :
- `maternelle_periodes` ✅
- `maternelle_semaines` ✅
- `maternelle_domaines` ✅
- `maternelle_sous_domaines` ✅
- `maternelle_sequences` ✅
- `maternelle_regles` ✅

Tables sans politique lecture publique (accès authentifié uniquement) :
- `maternelle_creneaux`
- `maternelle_ateliers`
- `maternelle_competences`

---

## ÉTAT DES DONNÉES EN BASE (27 août 2026)

| Source | Niveau | Période | Séquences | Règles | Créneaux |
|---|---|---|---|---|---|
| MHM MS/GS | GS | P1 | ⏳ | 69 | ✅ |
| MHM PS/MS | PS | P1 | ⏳ | 34 | ✅ |
| ACCÈS GS | GS | P1 | ✅ 14 | 51 | ✅ 77 |
| ACCÈS GS | GS | P2 | ✅ 13 | 53 | ✅ 126 |
| ACCÈS PS | PS | P1 | ✅ 11 | 44 | ✅ ~126 |
| Autour des livres TPS-PS | PS | P1 | ✅ 2 | 30 | — |

---

## COLONNES AJOUTÉES (historique)

```sql
-- 28 août 2026
ALTER TABLE maternelle_regles ADD COLUMN type_dispositif TEXT CHECK (type_dispositif IN ('dirigé', 'semi-dirigé', 'autonome'));
ALTER TABLE maternelle_regles ADD COLUMN IF NOT EXISTS exclu_marie BOOLEAN DEFAULT false;
```

## COLONNES MANQUANTES À AJOUTER (roadmap)

```sql
-- À exécuter avant l'insertion du matériel ACCÈS PS P1
ALTER TABLE maternelle_regles
  ADD COLUMN materiel_standard TEXT,
  ADD COLUMN materiel_a_preparer TEXT;
```

---

## ORDRE DE GÉNÉRATION SQL (toujours respecter)

1. `maternelle_sequences` — les séquences d'abord
2. `maternelle_regles` — les règles ensuite (FK vers sequences)
3. `maternelle_creneaux` — les créneaux en dernier (FK vers semaines + règles)

---

## CONVENTIONS IDs

| Table | Format | Exemple |
|---|---|---|
| maternelle_sequences | `{methode}-{niveau}-{periode}-seq-{NN}` | `acces-gs-p1-seq-01` |
| maternelle_regles | `{methode}-{niveau}-{periode}-r{NN}` | `acces-gs-p1-r01` |
| maternelle_creneaux | auto UUID | — |
| maternelle_semaines | auto UUID | — |

Méthodes :
- `acces-gs` = ACCÈS Vers l'écriture GS
- `acces-ps` = ACCÈS Vers l'écriture PS
- `mhm-gs` = MHM MS/GS
- `mhm-ps` = MHM PS/MS
- `phono-gs` = ACCÈS Vers la phono GS
- `livres-tps-ps` = ACCÈS Autour des livres TPS-PS
- `livres-gs` = ACCÈS Autour des livres GS
- `temps` = ACCÈS Vers le temps maternelle
