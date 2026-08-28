# MASTER BRIEF — Planificateur Maternelle

*Version 9.0 — 28 août 2026*

---

# 1. IDENTITÉ PROJET

Application web personnelle de planification et d'organisation de l'année scolaire pour une enseignante de maternelle, directrice d'école.

**Stack :** HTML / CSS / JS pur — en ligne, sync multi-appareils.
**Utilisatrice :** Enseignante PS/GS, directrice déchargée, non-développeuse, travaille sur ordinateur portable.
**Références pédagogiques :** Ouvrages ACCÈS, MHM, programmes cycle 1 BO mai 2026.

---

# 2. STACK TECHNIQUE

| Composant | Détail |
|---|---|
| Frontend | HTML / CSS / JS pur |
| BDD | Supabase (PostgreSQL + Auth) |
| Hébergement | Vercel |
| Serverless | Vercel Functions Node.js — dossier `api/` — syntaxe `module.exports` obligatoire |
| ⚠️ Package.json | N'existe PAS — toujours `fetch` REST direct vers Supabase |
| ⚠️ Limite API Vercel | ~11-12 fichiers max en version gratuite — regrouper les endpoints |
| ⚠️ vercel.json | Obligatoire pour servir HTML statique — voir section 12 |
| PDFs méthodes | Hébergés dans `public/pdfs/` du repo GitHub, servis via Vercel |
| Repo GitHub | sebyastien-netizen/planificateur-maternelle |
| URL Vercel | planificateur-maternelle.vercel.app |

---

# 3. ACCÈS ET IDENTIFIANTS

| Élément | Valeur |
|---|---|
| SUPABASE_URL | https://wqsprjlocuhandhvpytx.supabase.co |
| SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxc3ByamxvY3VoYW5kaHZweXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNTMwMDUsImV4cCI6MjA5OTkyOTAwNX0.elZ2-H2ACmNv6uKNCrK2P2kfxYJJEn1G4J-fZeKR3-Q |
| SUPABASE_SERVICE_KEY | Variable Vercel en place |
| UUID enseignante | 6c1b1768-457b-4777-b1d9-a309f2fe2cef |
| Supabase projet | Partagé avec Bar Chef — tables préfixées `maternelle_` |
| JWT expiry | 604800 (7 jours) — configuré le 28/08/2026 |

---

# 4. PROFIL UTILISATRICE

| Attribut | Détail |
|---|---|
| Rôle | Enseignante + Directrice déchargée |
| Classe | 9 PS + 13 GS |
| Jours en classe | Mardi (2 semaines sur 3) · Jeudi · Vendredi |
| Décharge | Lundi toujours · 1 mardi sur 3 |
| Zone académique | A |
| ATSEM | Présente une partie de la journée |
| Ressources | ACCÈS + MHM (ouvrages physiques) |

---

# 5. STRUCTURE PÉDAGOGIQUE DE RÉFÉRENCE

## Périodes scolaires — Zone A 2026-2027

| Période | UUID | Dates |
|---|---|---|
| Période 1 | c84c138a-60ac-43a1-afaf-cec696313b85 | 01/09/2026 → 16/10/2026 |
| Période 2 | 9b730f79-55ab-404f-b810-d2ed80cc7484 | 02/11/2026 → 18/12/2026 |
| Période 3 | 6cc0d611-5bb1-4abb-b966-c50c306ab260 | 05/01/2027 → 12/02/2027 |
| Période 4 | 13c7d322-e243-4e60-b894-56417f97f143 | 01/03/2027 → 09/04/2027 |
| Période 5 | 85b9c5b7-e68f-4bd9-9b59-10ea088a0a9c | 26/04/2027 → 03/07/2027 |

## Semaines P1

| N° | UUID | Date lundi |
|---|---|---|
| S1 | a4338c80-ee36-4b56-92a9-4eacca4c096a | 2026-08-31 |
| S2 | 1710aaea-db55-4f55-bf75-dbd5258ead88 | 2026-09-07 |
| S3 | f7c36cd8-3a6e-4317-962c-5d8edc16a888 | 2026-09-14 |
| S4 | 9b0b5d89-55e3-41f4-bda4-6a3fd89c0eb4 | 2026-09-21 |
| S5 | a8eff5fd-aa1d-4260-bb46-ddbe2c442d91 | 2026-09-28 |
| S6 | 91832461-1a4a-431f-9b04-0659588567a7 | 2026-10-05 |
| S7 | 047ff3bd-d389-48ff-8d2c-7e21fb1a14a7 | 2026-10-12 |

## Semaines P2

| N° | UUID | Date lundi |
|---|---|---|
| S1 | 10e12f2c-aeec-462d-812c-8c9384412480 | 2026-11-02 |
| S2 | 9760f7f7-1f6f-4e15-9910-5310310772e1 | 2026-11-09 |
| S3 | 860c8000-3ba4-4d0e-a177-45613455cb0e | 2026-11-16 |
| S4 | 24e624e0-23ca-455d-8f5f-b4a9f00a9395 | 2026-11-23 |
| S5 | 268c5794-6ee6-4187-b943-72d201682501 | 2026-11-30 |
| S6 | 2b736f68-1bf3-473e-827b-c929b8a3807d | 2026-12-07 |
| S7 | a739fa23-df85-474f-8567-1273e189ca39 | 2026-12-14 |

## Organisation des ateliers — RÈGLE ABSOLUE

**4 groupes simultanés par rotation, TOUJOURS :**

| Groupe | Rôle | Description |
|---|---|---|
| Groupe A (GS ou PS) | ENS | Activité dirigée |
| Groupe B (même niveau que A) | AUTO | Activité autonome |
| Groupe C (l'autre niveau) | ATSEM | Activité semi-dirigée |
| Groupe D (même niveau que C) | AUTO | Activité autonome |

**Rotation 1 = Rotation 2 — même contenu, groupes A↔B et C↔D permutés.**

ENS et ATSEM gardent la même séance entre R1 et R2 — elles changent uniquement de sous-groupe (A→B), pas de niveau, pas de contenu.

⚠️ C'est l'enseignante qui décide sur place si elle prend les GS ou les PS. Dans l'app, la séance est assignée à un créneau ENS sans distinction de niveau — elle et son ATSEM s'arrangent oralement si besoin. Marie ne gère pas cette répartition.

**Exemple :** Marie propose créneau ENS = "Décomposer 10" (GS), créneau ATSEM = "Peinture avec les doigts" (PS). En R2, mêmes séances, groupes permutés. Le jour J, l'enseignante décide de prendre les PS à la place — elle fait "Peinture avec les doigts" avec PS A, son ATSEM fait "Décomposer 10" avec GS A. L'app ne change rien.

**Attribution des séances par type de dispositif :**
- ENS → séance **dirigée**
- ATSEM → séance **semi-dirigée**
- AUTO → séance **autonome** d'une **autre méthode** que ENS/ATSEM

## Mapping jours → MHM

| Jour de classe | Jour MHM |
|---|---|
| Mardi | J2 |
| Jeudi | J3 |
| Vendredi | J4 |
| J1 MHM | Panneau rituels référence uniquement |

---

# 6. PDFs MÉTHODES

## Hébergement

PDFs hébergés dans `public/pdfs/` du repo GitHub, servis via Vercel. Accès sans CORS. Le viewer natif Chrome supporte `#page=X`.

## Fichiers en place

| Fichier | URL Vercel |
|---|---|
| `acces_phono_gs_p1.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/acces_phono_gs_p1.pdf |
| `acces_ecriture_gs_p1.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/acces_ecriture_gs_p1.pdf |
| `acces_ecriture_gs_p2.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/acces_ecriture_gs_p2.pdf |
| `acces_ecriture_ps_p1.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/acces_ecriture_ps_p1.pdf |
| `mhm_gs_p1.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/mhm_gs_p1.pdf |
| `mhm_ps_p1.pdf` | https://planificateur-maternelle.vercel.app/public/pdfs/mhm_ps_p1.pdf |

## Visualisation

Tiroir latéral droit dans l'encyclopédie et le cahier journal. `<iframe src="url#page=X">` → qualité native Chrome, navigation à la bonne page, reste dans l'app.

---

# 7. RÈGLES D'EXTRACTION ACCÈS (universelles)

| Règle | Valeur |
|---|---|
| Ordre des séquences | Ordre strict des pages du livre |
| Ordre des séances | Ordre strict dans la séquence |
| Mention de semaines | Zéro dans les tableaux HTML |
| Interprétation pédagogique | Zéro — extraction fidèle |
| Matériel | Badges STANDARD (vert) / À PRÉPARER (orange) |
| Lien inter-méthodes | Badge 🔗 LIEN INTER-MÉTHODES + méthode + page |
| S7 | Toujours tampon vide — Marie ne pré-remplit pas |
| Activités SI TEMPS | Bloc dédié en bas, pas intercalées |
| Évaluations | 1 séance AUTO dédiée, différenciation par niveau |

## Règles spécifiques Phono GS

| Règle | Valeur |
|---|---|
| Pool (p.22-27 + p.38) | 4 catégories : Comptines / Écoute / Articulation / Ludique mots |
| Distribution pool | 1 par catégorie par semaine, S2→S6 |
| Séquences principales | Pages 28-59, ordre strict |
| Réitération séance entière | Badge À RÉITÉRER |
| Réitération interne à séance | Note descriptive uniquement |
| Encarts "Mon carnet de suivi" | Ignorés |

## Format HTML v5 — référence

Fichier de référence : `ACCES_PS_P1_verification_v5.html` (tableau de vérification validé par l'enseignante).

---

# 8. ÉTAT DES EXTRACTIONS

## ACCÈS Vers l'écriture GS

| Période | Tableau HTML | Séquences | Règles | Créneaux |
|---|---|---|---|---|
| P1 | ✅ v2 | ✅ 14 | ✅ 51 | ✅ 77 |
| P2 | ✅ v2 | ✅ 13 | ✅ 53 | ✅ 126 |
| P3→P5 | ⏳ | ⏳ | ⏳ | ⏳ |

## ACCÈS Vers l'écriture PS

| Période | Tableau HTML | Séquences | Règles | Créneaux |
|---|---|---|---|---|
| P1 | ✅ v5 | ✅ 11 | ✅ 44 | ✅ ~126 |
| P2→P5 | ⏳ | ⏳ | ⏳ | ⏳ |

## ACCÈS Vers la phono GS

| Période | Tableau HTML | Séquences | Règles | Créneaux |
|---|---|---|---|---|
| P1 | ✅ v3 | ✅ 23 | ✅ 52 | ✅ 21 |
| P2→P5 | ⏳ | ⏳ | ⏳ | ⏳ |

## MHM MS/GS

| Période | Tableau HTML | Règles | Séquences |
|---|---|---|---|
| P1 | ✅ | ✅ 69 | ⏳ à créer |

## MHM PS/MS

| Période | Tableau HTML | Règles | Séquences |
|---|---|---|---|
| P1 | ✅ | ✅ 34 | ⏳ à créer |

**Stratégie :** largeur d'abord — toutes méthodes P1 avant d'approfondir P2→P5.

---

# 9. ARCHITECTURE BDD SUPABASE (état v8)

## Tables

```
maternelle_periodes            ✅ RLS lecture publique
maternelle_semaines            ✅ RLS lecture publique
maternelle_sequences           ✅ RLS lecture publique
maternelle_regles              ✅ RLS lecture publique
maternelle_creneaux            ✅ RLS lecture publique
maternelle_domaines            ✅ RLS lecture publique
```

## Colonnes ajoutées en session v8

```sql
-- Statut exécution séance
ALTER TABLE maternelle_creneaux
  ADD COLUMN statut TEXT DEFAULT 'a_faire'
  CHECK (statut IN ('a_faire', 'fait', 'non_fait', 'a_refaire'));

-- Statut planification séance
ALTER TABLE maternelle_creneaux
  ADD COLUMN statut_planification TEXT DEFAULT 'actif'
  CHECK (statut_planification IN ('actif', 'en_attente', 'en_sommeil'));

-- Type dispositif
ALTER TABLE maternelle_regles
  ADD COLUMN type_dispositif TEXT
  CHECK (type_dispositif IN ('dirigé', 'semi-dirigé', 'autonome'));

-- Note placement (justification Marie)
-- ⏳ À créer — voir roadmap
```

## Contraintes modifiées en session v8

```sql
-- Type créneau — étendu
CHECK (type IN ('fixe', 'variable', 'libre', 'atelier'))

-- Contrainte activite_ou_regle — SUPPRIMÉE
-- (pour permettre les créneaux ateliers vides)
DROP CONSTRAINT chk_activite_ou_regle;
```

## État type_dispositif par source

| Source | dirigé | semi-dirigé | autonome |
|---|---|---|---|
| ACCÈS GS P1 | 19 | 16 | 16 |
| ACCÈS GS P2 | 22 | 9 | 22 |
| ACCÈS PS P1 | 25 | 10 | 9 |
| Phono GS P1 | 42 | 2 | 7 |
| MHM GS P1 | 29 | — | 18 |
| MHM PS P1 | 15 | — | 19 |

## Données en base (état v8)

| Source | Niveau | Période | Séquences | Règles | Créneaux |
|---|---|---|---|---|---|
| MHM MS/GS | GS | P1 | ⏳ | 69 | ✅ |
| MHM PS/MS | PS | P1 | ⏳ | 34 | ✅ |
| ACCÈS GS | GS | P1 | ✅ 14 | 51 | ✅ 77 |
| ACCÈS GS | GS | P2 | ✅ 13 | 53 | ✅ 126 |
| ACCÈS PS | PS | P1 | ✅ 11 | 44 | ✅ ~126 |
| ACCÈS Phono GS | GS | P1 | ✅ 23 | ✅ 52 | ✅ 21 |
| Ateliers vides | GS+PS | P1 | — | — | ✅ 144 |

---

# 10. FONCTIONNALITÉS (état v8)

## Cahier journal (`semaine.html`)

- ✅ Vue semaine dynamique depuis Supabase
- ✅ Bascule matin / après-midi
- ✅ Jours en colonnes selon jours actifs
- ✅ Badges PS/GS/FIXE + ENS/ATSEM/AUTO
- ✅ Pré-remplissage automatique par Marie (rituels MHM P1)
- ✅ Créneaux ACCÈS GS P1+P2 + PS P1 + Phono GS P1 affichés
- ✅ Sélecteur de période (P1→P5) + select semaine + boutons ◀ ▶
- ✅ Panneau rituels — tiroir latéral (ajouter / remplacer / supprimer)
- ✅ Toutes les séances cliquables
- ✅ Menu contextuel étendu : Ajouter / Saisie libre / Voir séance / Voir matériel / Voir PDF / Supprimer / Marquer À refaire
- ✅ Tiroir PDF : chaîne créneau→règle→séquence→PDF à la bonne page
- ✅ Tiroir "Voir séance" : fiche HTML synthétique
- ✅ Tiroir "Voir matériel" : standard / à préparer + rappel plastification
- ✅ Tiroir "Saisie libre" : zone de texte persistée (`type='libre'`)
- ✅ Badges visuels : 📄 PDF dispo, 🔴 matériel à préparer
- ✅ **Statut fait/non fait/à refaire** — indicateur cliquable sur chaque séance, cycle ⬜→✅→❌→⬜, PATCH direct Supabase sans rechargement
- ✅ **Popup suppression** — Retirer (en_attente) / Mettre en sommeil (en_sommeil)
- ✅ **Ateliers vides** — 4 créneaux "À remplir" par rotation, R1=R2, S1→S6
- ✅ **Filtre statut_planification** — seuls les créneaux `actif` s'affichent
- ⏳ Bandeau décalages en cours
- ⏳ Bouton "Organiser mes créneaux" (moteur Marie)
- ⏳ Modification séance via tiroir Marie
- ⏳ Imprimable

## Encyclopédie (`encyclopedie.html`)

- ✅ Navigation 3 colonnes Domaine → Séquence → Séances
- ✅ Séquences ACCÈS GS P1+P2 + PS P1 + Phono GS P1 consultables
- ✅ Tiroir PDF latéral : `<iframe src="url#page=X">` qualité native
- ⏳ Réactivation séances "en sommeil" depuis l'encyclopédie
- ⏳ Séquences MHM à créer dans `maternelle_sequences`

## Préparation (`preparation.html`)

- ⏳ Vue Période : Kanban matériel 3 colonnes
- ⏳ Vue Semaine : matériel à sortir la semaine d'avant
- ⏳ Détection automatique comptines → rappel plastification A5

## Progression (`progression.html`)

- ⏳ Vue consultation pure — colonnes par méthode/niveau
- ⏳ Code couleur : vert fait / rouge non fait / gris à faire / orange en attente
- ⏳ Lecture instantanée avancement par méthode

---

# 11. INTERACTIONS CAHIER JOURNAL — RÈGLES UX

## Menu contextuel

| Option | Action |
|---|---|
| ＋ Ajouter | Tiroir bibliothèque séances (Marie) |
| ✏️ Saisie libre | Tiroir zone de texte → `type='libre'` en base |
| 📋 Voir la séance | Tiroir fiche HTML synthétique |
| 📎 Voir le matériel | Tiroir matériel standard/à préparer |
| 📄 Voir dans le PDF | Tiroir iframe PDF à la bonne page |
| 🔁 Marquer À refaire | PATCH statut = 'a_refaire' |
| ✕ Supprimer | Popup Retirer / Mettre en sommeil |

## Popup suppression

| Option | Statut résultant | Effet |
|---|---|---|
| 📤 Retirer | `en_attente` | Créneau masqué + badge ⏳ dans header |
| 💤 Mettre en sommeil | `en_sommeil` | Créneau masqué + réactivable depuis encyclopédie |

## Statut séances

| Statut | Emoji | Déclencheur | Conséquence |
|---|---|---|---|
| `a_faire` | ⬜ | Par défaut | Rien |
| `fait` | ✓ | Clic indicateur | Progression avance |
| `non_fait` | ✕ | Clic indicateur | Reproposé |
| `a_refaire` | ↺ | Menu contextuel | Reproposé, progression bloquée |

Séances `type='fixe'` exclues du suivi statut.

## Ateliers — architecture des 4 groupes

R1 et R2 contiennent exactement les mêmes 4 séances. Seuls les sous-groupes permutent (A↔B, C↔D). ENS et ATSEM gardent la même séance — elles changent de sous-groupe uniquement. L'enseignante décide sur place qui prend quel niveau.

---

# 12. MOTEUR DE PROPOSITION MARIE — RÈGLES (validées par l'enseignante)

Document de référence : `regles_marie_v2.docx` — validé et mis à jour le 28 août 2026.

**34 règles organisées en 2 catégories :**

- **Règles fixes** (non-négociables) : ordre/progression, cohérence rôle/dispositif, cohérence niveau, rotations, temporel, pédagogie, sécurité
- **Règles ajustables** (modulables par l'enseignante) : charge hebdomadaire, badges spéciaux, mémoire/traçabilité

**Statut :** ✅ validées par l'enseignante → prochaine étape : encodage dans le prompt Marie → développement interface.

**Ajouts de l'enseignante intégrés en v2 :**
- R15 : S1 — PS commencent uniquement par Autour des livres ; autres méthodes PS débutent en S2
- R16 : S1 — tous les GS en autonomie pour accueillir les PS
- R18 : début de période → privilégier une séance de réactivation si la méthode en propose une
- R24 : liens inter-méthodes — mécanisme delta_positions (voir section ci-dessous)

---

## Architecture des liens inter-méthodes (R24)

### Contexte

Certaines séances sont communes à deux méthodes différentes (ex. "réaliser des empreintes avec ses mains" dans Autour des livres PS = "produire des traces avec ses mains et de la peinture" dans Vers l'écriture PS). L'enseignante veut que les deux méthodes arrivent à leur séance commune **au même moment**.

### Décision architecturale

Une table dédiée `maternelle_liens_methodes` encode les paires de séances liées.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | PK auto |
| `regle_source_id` | text | Séance de la méthode "en avance" |
| `regle_cible_id` | text | Séance de la méthode "qui suit" |
| `delta_positions` | integer | `position_source - position_cible` — calculé à la création, statique |
| `type_lien` | text | `'synchronisation'` |
| `note` | text | Description lisible du lien |

### Logique de Marie

- `delta_positions` est calculé **une fois à la création** du lien, à partir des positions des séances dans leurs séquences respectives. Il ne change pas.
- Marie débloque la séance cible quand la progression dans la méthode source atteint `position_source - delta_positions`.
- Le rythme est dicté par les méthodes elles-mêmes — pas calculé dynamiquement.
- Si l'enseignante modifie manuellement un planning et crée un écart > delta attendu, Marie génère une **alerte visible** — pas un blocage.

### Exemple

- Source : Autour des livres PS, séance 15 ("empreintes mains")
- Cible : Vers l'écriture PS, séance 1 ("traces mains peinture")
- `delta_positions` = 15 - 1 = 14
- Marie débloque la séance cible quand la séance 1 de la source est faite (15 - 14 = 1)

### Statut

Table `maternelle_liens_methodes` à créer et peupler **après** que toutes les méthodes soient extraites. Les liens identifiés dans les HTML de vérification seront recensés à ce moment.

---

# 13. ARCHITECTURE MULTI-AGENTS

| Agent | Signal | Rôle |
|---|---|---|
| **Chef de projet** | (défaut) | Claude — orchestre, arbitre, synthétise |
| **Marie** | "Marie" en début de message | Pédagogue — cadrage, extraction, validation, ton critique |
| **Lucas** | "Lucas" en début de message | Développeur — code, BDD, Supabase, Vercel |

---

# 14. FICHIERS GITHUB (état v8)

| Fichier | Usage | État |
|---|---|---|
| `index.html` | Login | ✅ |
| `accueil.html` | Page d'accueil post-login | ✅ |
| `semaine.html` | Cahier journal | ✅ |
| `encyclopedie.html` | Encyclopédie + tiroir PDF | ✅ |
| `preparation.html` | Préparation matériel | ⏳ |
| `progression.html` | Vue progression par méthode | ⏳ |
| `vercel.json` | Routing | ✅ |
| `public/pdfs/` | PDFs méthodes | ✅ 6 fichiers |
| `api/semaine.js` | GET semaine + créneaux (filtre statut_planification=actif) | ✅ |
| `api/marie-preremplir.js` | POST pré-remplissage | ✅ |
| `api/rituels.js` | GET rituels MHM | ✅ |
| `api/rituels-ajouter.js` | POST ajouter rituel | ✅ |
| `api/rituels-remplacer.js` | POST remplacer rituel | ✅ |
| `api/rituels-supprimer.js` | POST supprimer rituel | ✅ |
| `SUIVI_ECARTS_EXTRACTION.md` | Suivi écarts d'extraction Marie | ✅ |
| `regles_marie.docx` | Règles moteur proposition — à valider | ✅ |

---

# 15. CONVENTIONS DE CODE

- Commentaires en français, variables/fonctions en anglais
- Toujours `fetch` REST direct vers Supabase — jamais de package npm
- **Syntaxe Vercel Functions : `module.exports` — jamais `export default`**
- ORDER BY Supabase : toujours `heure_debut.asc,id.asc` pour ordre stable
- UUID enseignante : `6c1b1768-457b-4777-b1d9-a309f2fe2cef`
- Token auth : `sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY`
- Filtre créneaux : toujours `statut_planification=eq.actif` dans les requêtes

---

# 16. ROADMAP (v8)

## Immédiat — moteur Marie

- [x] ~~Retour validation enseignante sur `regles_marie.docx`~~ ✅ validé 28/08/2026
- [ ] Encodage des 34 règles validées dans le prompt Marie
- [ ] Interface bouton "Organiser mes créneaux" (tiroir + appel API Claude)
- [ ] Colonne `note_placement` dans `maternelle_creneaux`
- [ ] Table `maternelle_liens_methodes` — à créer après extraction complète de toutes les méthodes

## Court terme — suivi et navigation

- [ ] Bandeau "décalages en cours" dans le header
- [ ] `progression.html` — vue consultation par méthode
- [ ] Réactivation séances "en sommeil" depuis encyclopédie
- [ ] `preparation.html` — Kanban matériel

## Court terme — complétion données

- [ ] MHM GS+PS P1 — séquences à créer dans `maternelle_sequences`
- [ ] Mardis de décharge P2 → `a_mardi` dans `maternelle_semaines`
- [ ] ACCÈS PS P1 séquences 8-9-10 — règles manquantes (voir SUIVI_ECARTS)

## Moyen terme

- [ ] Modification séance via tiroir Marie
- [ ] Impression optimisée cahier journal
- [ ] Fonctionnalité "jours travaillés" par semaine

## Extractions à venir

- [ ] ACCÈS Vers la phono GS P2
- [ ] ACCÈS Autour des livres TPS-PS P1
- [ ] ACCÈS Autour des livres GS P1
- [ ] ACCÈS Vers le temps maternelle P1

## Long terme

- [ ] Suivi compétences par élève
- [ ] Vue annuelle par domaine
- [ ] EVAR (sur sollicitation uniquement)

---

# 17. FICHIERS DE RÉFÉRENCE PROJET

| Fichier | Description |
|---|---|
| `MASTER_BRIEF_MATERNELLE_v9.md` | Ce fichier |
| `SQL_SCHEMA.md` | Schéma BDD complet + gotchas + exemples INSERT |
| `SUIVI_ECARTS_EXTRACTION.md` | Écarts extractions Marie — à maintenir |
| `regles_marie_v2.docx` | 34 règles moteur proposition — ✅ validées par l'enseignante |
| `INSTRUCTIONS_MARIE_v1.md` | Cadrage agent pédagogue |
| `INSTRUCTIONS_LUCAS_v1.md` | Cadrage agent développeur |
| `phono_GS_P1_verification_v3.html` | Tableau référence Phono GS P1 |
| `ACCES_PS_P1_verification_v5.html` | Tableau référence format HTML v5 |

---

*Sessions : JOURNAL_21aout · JOURNAL_22aout_aprem · JOURNAL_23aout · JOURNAL_24aout · JOURNAL_27aout_matin · JOURNAL_27aout_aprem · JOURNAL_28aout · JOURNAL_28aout_aprem*
