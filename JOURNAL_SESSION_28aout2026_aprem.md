# JOURNAL SESSION — 28 août 2026 (après-midi)
Planificateur Maternelle — Session complète
---

## TRAVAUX RÉALISÉS

### Règles Marie v2
- Retour enseignante intégré : 4 nouvelles règles (R15, R16, R18, R24)
- R32 (badge LIEN INTER-MÉTHODES) supprimée — redondante avec R24
- Renumérotation propre → 34 règles finales
- `regles_marie_v2.docx` généré et commité

### Architecture liens inter-méthodes
- Décision actée : table `maternelle_liens_methodes` avec `delta_positions` statique
- Mécanisme d'anticipation : delta calculé à la création du lien, pas dynamiquement
- Mécanisme d'alerte : divergence détectée si ENS modifie le planning → signal visible, pas blocage
- Rythme dicté par les méthodes elles-mêmes
- Documenté dans Master Brief v9 section 12

### Extraction Autour des livres TPS-PS
- "L'école" : 18 séances, 4 phases — tableau HTML validé par l'ENS
- "L'objet livre" : 12 séances, 3 phases — tableau HTML validé (lien Vers l'autonomie p.66 noté)
- SQL inséré : 2 séquences + 30 règles
- Colonne `exclu_marie` ajoutée à `maternelle_regles` — r19-r30 (L'objet livre, géré remplaçant) marquées `true`

### Moteur de proposition Marie
- Prompt Marie rédigé (34 règles encodées) → `prompt_marie_ateliers.md`
- `api/marie-ateliers.js` codé : 6 étapes Supabase + appel OpenAI gpt-4o
- Route ajoutée dans `vercel.json`
- `OPENAI_API_KEY` ajoutée dans Vercel (nouveau projet OpenAI)
- Passage de gpt-4o-mini à gpt-4o pour meilleure conformité aux règles
- Rappel règles critiques injecté dans le message user (8 points)
- Tests itératifs : S1 validée (R15/R16 respectées, vides corrects)

### Interface "Organiser mes créneaux"
- Superposition plein écran sur `semaine.html`
- Navigation libre semaines + validation journée par journée
- Bulle Marie avec explication + conseil par journée
- 4 créneaux distincts par jour avec badges rôle/niveau
- Bouton (i) tooltip par créneau
- Bouton "Annuler" + "Fermer et enregistrer" (PATCH en base des décisions acceptées)
- Données simulées → branchement API réelle

### Interface "Choisir une séance atelier"
- Superposition centrée avec 6 colonnes méthodes
- Code couleur : vert (fait) / gris (à faire) / orange (en attente) / rouge (non fait) / grisé (incompatible)
- Séances incompatibles affichées mais non cliquables + raison
- Barre de progression par méthode
- Clic → PATCH créneau + rechargement

### Saisie libre enrichie
- Nouveaux champs : Qui (ENS/ATSEM/AUTO) + Niveau (GS/PS/PS+GS) + Matériel
- Case "Sauvegarder dans Mes séances" → INSERT dans `maternelle_regles` (source='Mes séances', exclu_marie=true)
- PATCH créneau existant ou POST nouveau créneau selon contexte
- Colonne `materiel_a_preparer` ajoutée à `maternelle_regles`

---

## DÉCISIONS ACTÉES

### Séances custom (hors méthode)
- Stockées dans `maternelle_regles` avec `source = 'Mes séances'` et `exclu_marie = true`
- Marie les voit comme créneaux occupés (pas vides) → peut signaler conflits
- Marie ne les propose jamais automatiquement
- Réutilisables depuis "Choisir une séance" (colonne dédiée à ajouter)
- Matériel intégré dans `materiel_a_preparer` → compatible avec `preparation.html` futur

### Texte libre = créneau occupé
- Un créneau avec `activite != null` est considéré occupé par Marie
- Même sans `regle_id`

---

## COLONNES AJOUTÉES EN BASE
- `maternelle_regles.exclu_marie` BOOLEAN DEFAULT false
- `maternelle_regles.materiel_a_preparer` TEXT
- `maternelle_regles.type_dispositif` TEXT (session précédente)

---

## PROCHAINE SESSION

### Priorités
1. Retour ENS sur "Organiser mes créneaux" → corrections éventuelles
2. Colonne "Mes séances" dans "Choisir une séance"
3. Fix Marie : créneaux déjà remplis non pris en compte (texte libre + séance ajoutée)
4. `progression.html` — vue consultation
5. `note_placement` dans `maternelle_creneaux`
6. Réactivation séances "en sommeil" depuis encyclopédie
7. Extractions méthodes restantes

### À charger en début de session
- `MASTER_BRIEF_MATERNELLE_v9.md`
- `SQL_SCHEMA.md`
- `SUIVI_ECARTS_EXTRACTION.md`
- Journal de session du jour
