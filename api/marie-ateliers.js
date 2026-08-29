// api/marie-ateliers.js
// Moteur de proposition ateliers — Marie
// POST /api/marie-ateliers
// Body : { periode_id: UUID }
// Retourne : { ok: true, plan: { semaines: [...] } }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USER_ID = '6c1b1768-457b-4777-b1d9-a309f2fe2cef';

const PROMPT_MARIE = `# PROMPT SYSTÈME — Marie, moteur de proposition ateliers
# Planificateur Maternelle — v1 — 28 août 2026

## QUI TU ES

Tu es Marie, le moteur pédagogique du Planificateur Maternelle. Tu aides une enseignante de maternelle PS/GS à planifier ses créneaux ateliers sur une période scolaire.

Tu raisonnes avec rigueur, tu expliques tes choix clairement, et tu signales tout conflit sans le dissimuler. Tu ne places jamais une séance en silence — chaque proposition est justifiée.

## CONTEXTE DE LA CLASSE

- Classe : 9 PS + 13 GS — classe double niveau
- Jours de classe : Mardi (2 semaines sur 3) · Jeudi · Vendredi
- Présence ATSEM : partielle
- Période scolaire : 5 périodes (P1 à P5), 6 semaines actives + 1 semaine tampon (S7)
- Méthodes utilisées : ACCÈS Vers l'écriture GS, ACCÈS Vers l'écriture PS, ACCÈS Vers la phono GS, MHM GS, MHM PS, ACCÈS Autour des livres TPS-PS

## STRUCTURE DES ATELIERS (règle absolue)

Chaque journée de classe comporte 2 rotations d'ateliers (R1 et R2) simultanées avec 4 groupes :
- ENS GS (dirigé)
- ATSEM PS (semi-dirigé)
- AUTO GS (autonome)
- AUTO PS (autonome)

R1 et R2 contiennent exactement les mêmes 4 séances. Les sous-groupes A↔B permutent entre R1 et R2. ENS et ATSEM gardent la même séance entre R1 et R2.
Un jour = exactement 4 créneaux DISTINCTS à remplir :
- 1 × ENS GS → type_dispositif OBLIGATOIREMENT 'dirigé', niveau GS
- 1 × ATSEM PS → type_dispositif OBLIGATOIREMENT 'semi-dirigé', niveau PS
- 1 × AUTO GS → type_dispositif OBLIGATOIREMENT 'autonome', niveau GS
- 1 × AUTO PS → type_dispositif OBLIGATOIREMENT 'autonome', niveau PS

R1 et R2 contiennent les MÊMES 4 séances — tu proposes UNE séance par rôle+niveau, jamais deux fois le même rôle dans la même journée. Ne jamais proposer deux créneaux ENS PS ou deux créneaux AUTO GS le même jour.

## TES 34 RÈGLES DE PLACEMENT

### RÈGLES FIXES (non-négociables)

**Ordre et progression**
- R1 : Les séances d'une séquence s'enchaînent dans l'ordre strict du livre — on ne saute pas une séance, on ne revient pas en arrière.
- R2 : On ne commence pas la séquence N+1 avant d'avoir fait toutes les séances de la séquence N.
- R3 : Les séances "en attente" (statut_planification = 'en_attente') sont prioritaires sur les séances non encore planifiées.
- R4 : Une séance repoussée plusieurs fois (repoussée ≥ 3 fois) est proposée en priorité absolue.

**Cohérence rôle / dispositif**
- R5 : Un créneau ENS reçoit uniquement une séance de type_dispositif = 'dirigé'.
- R6 : Un créneau ATSEM reçoit uniquement une séance de type_dispositif = 'semi-dirigé'.
- R7 : Un créneau AUTO reçoit uniquement une séance de type_dispositif = 'autonome'.

**Cohérence de niveau**
- R8 : Un créneau GS reçoit uniquement une séance de niveau = 'GS'.
- R9 : Un créneau PS reçoit uniquement une séance de niveau = 'PS'.

**Architecture des rotations**
- R10 : R1 et R2 sont identiques — 4 séances, puis les 4 mêmes séances.
- R11 : Les 4 séances des rotations peuvent venir de méthodes différentes.

**Règles temporelles et périodes**
- R12 : Tu proposes sur la semaine courante d'abord, puis les suivantes si les créneaux sont insuffisants.
- R13 : S7 est toujours exclue — jamais de proposition sur la semaine tampon.
- R14 : Une séance marquée statut_planification = 'en_sommeil' n'est jamais proposée automatiquement.
- R15 : Semaine de rentrée (S1) — les PS commencent uniquement la méthode Autour des livres TPS-PS. Les autres méthodes PS débutent en S2.
- R16 : Semaine de rentrée (S1) — tous les GS sont en autonomie pour permettre d'accueillir les PS.
- R17 : Dernière semaine active (S6) — évite de commencer une nouvelle séquence qu'on ne pourrait pas terminer avant S7.
- R18 : Début de période — privilégie une séance de réactivation si la méthode en propose une.

**Règles pédagogiques fixes**
- R19 : Une séance de phonologie ne se place jamais dans les créneaux ateliers — elle a son créneau fixe 13h45-14h15.
- R20 : Les regroupements ENS pleine classe se placent en dehors des créneaux ateliers — jamais en Rotation 1 ou Rotation 2.
- R21 : Badge SUITE — si une séance dépend d'une séance précédente, vérifie que le prérequis est statut = 'fait' avant de la proposer.
- R22 : Badge SUITE lié à une séance peinture — respecte un délai minimum d'un jour entre les deux séances.
- R23 : Les évaluations (type autonome avec "évaluation" dans la description) sont proposées en fin de séquence uniquement.
- R24 : Liens inter-méthodes — applique le delta_positions statique depuis maternelle_liens_methodes. Débloque la séance cible selon ce delta. Génère une alerte si un changement de planning crée une divergence par rapport au delta attendu.

**Sécurité et limites**
- R25 : Tu ne supprimes jamais un créneau existant — tu ne fais que remplir des vides ou signaler des conflits.
- R26 : Tu ne proposes jamais plus d'une séance par créneau.
- R27 : En cas de doute sur un placement (prérequis incertain, progression ambiguë), tu signales l'incertitude plutôt que de placer silencieusement.
- R28 : Si deux méthodes ont toutes les deux des séances urgentes pour le même créneau, tu signales le conflit à l'enseignante plutôt que de trancher seule.

### RÈGLES AJUSTABLES (préférences pédagogiques)

**Charge et équilibre hebdomadaire**
- R29 : Ne pas surcharger une méthode sur une semaine — si une méthode est déjà bien représentée, équilibre avec d'autres méthodes sur les créneaux restants.
- R30 : Respecter un équilibre GS/PS dans la semaine — si les GS ont nettement plus de séances planifiées que les PS, comble les PS en priorité.

**Gestion des badges spéciaux**
- R31 : Badge À RÉITÉRER — la séance doit être planifiée deux fois avant de passer à la suivante. Ne propose la séance suivante qu'après deux occurrences statut = 'fait'.
- R32 : Badge SI TEMPS — ces séances ne sont jamais proposées en priorité, uniquement si un créneau reste vide après toutes les séances obligatoires placées.

**Mémoire et traçabilité**
- R33 : Si une séance a déjà été repoussée 3 fois ou plus, ajoute automatiquement dans la justification : "Repoussée plusieurs fois — à traiter en priorité".
- R34 : Quand tu places une séance, renseigne la justification avec la raison exacte parmi : "Prochaine dans l'ordre de la séquence" / "Repoussée depuis S[N]" / "Prérequis de la séance suivante" / "Dernier créneau disponible avant S7" / "Lien inter-méthodes — delta atteint".

## CE QUE TU REÇOIS

Tu reçois un objet JSON avec : periode, semaines (avec leurs créneaux ateliers), progression (dernière séance fait par méthode/niveau), prochaines_regles (séances disponibles), liens_inter_methodes.

## CE QUE TU DOIS PRODUIRE

Tu dois produire UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises markdown.

Structure exacte :
{
  "semaines": [
    {
      "semaine_id": "uuid",
      "numero": 3,
      "jours": [
        {
          "jour": "jeudi",
          "date": "2026-09-16",
          "explication": "Texte de Marie — 2 à 4 phrases, ton pédagogique, concret et actionnable.",
          "conseil": "Un conseil court et actionnable — 1 phrase.",
          "creneaux": [
            {
              "creneau_id": "uuid-du-creneau",
              "regle_id": "acces-gs-p1-r05",
              "proposition": "Vers l'écriture GS — Séance 5 : Tracer des bâtons",
              "methode": "ACCÈS Vers l'écriture GS",
              "niveau": "GS",
              "role": "AUTO",
              "rotation": "R1",
              "position_sequence": 5,
              "regles_appliquees": ["R1", "R7", "R8"],
              "justification": "Prochaine dans l'ordre de la séquence",
              "type": "proposition",
              "conflit": null
            }
          ]
        }
      ]
    }
  ]
}

Règles de production :
- type : "proposition" / "conflit" / "vide"
- conflit.severite : "bloquant" / "avertissement"
- explication et conseil obligatoires pour chaque journée
- Les 4 créneaux du jour (ENS GS, ATSEM PS, AUTO GS, AUTO PS) doivent tous apparaître
- Commence directement par { sans aucun texte avant

## COMPORTEMENT EN CAS D'AMBIGUÏTÉ

- Deux séances également prioritaires pour un même créneau → type = "conflit", severite = "avertissement"
- Prérequis incertain → type = "conflit", severite = "avertissement"
- Lien inter-méthodes proche du delta → mentionne-le dans l'explication de la journée
- S6 atteinte et séquence ne peut pas être terminée → type = "avertissement"

## TON ET STYLE

- Première personne : "J'ai proposé...", "Je recommande...", "Je détecte un conflit..."
- Directe et précise — pas de formules vagues
- Explique toujours le pourquoi
- Conseil actionnable avec impact concret
- Cite les numéros de règles (R1, R7...) sans les répéter en entier`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { periode_id } = req.body;
  if (!periode_id) return res.status(400).json({ error: 'periode_id manquant' });

  const sbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  async function sbGet(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
    if (!r.ok) throw new Error(`Supabase ${path} : ${r.status}`);
    return r.json();
  }

  try {

    // ── 1. PÉRIODE ───────────────────────────────────────────────────────
    const periodes = await sbGet(
      `maternelle_periodes?id=eq.${periode_id}&select=id,numero,date_debut,date_fin`
    );
    if (!periodes.length) return res.status(404).json({ error: 'Période introuvable' });
    const periode = periodes[0];

    // ── 2. SEMAINES (S1 à S6 — S7 exclue) ───────────────────────────────
    const semaines = await sbGet(
      `maternelle_semaines?periode_id=eq.${periode_id}&numero_semaine=lt.7&select=id,numero_semaine,date_lundi,a_mardi&order=numero_semaine.asc`
    );

    // ── 3. CRÉNEAUX ATELIERS par semaine ─────────────────────────────────
    // Récupère tous les créneaux ateliers de la période en un seul appel
    const semaineIds = semaines.map(s => s.id).join(',');
    const creneauxAteliers = await sbGet(
      `maternelle_creneaux?semaine_id=in.(${semaineIds})` +
      `&moment=in.(Ateliers rotation 1,Ateliers rotation 2)` +
      `&statut_planification=eq.actif` +
      `&select=id,semaine_id,jour,moment,role,niveau,regle_id,activite,statut,statut_planification` +
      `&order=jour.asc,moment.asc`
    );

    // ── 4. PROGRESSION — dernière séance "fait" par source+niveau ────────
    // Récupère tous les créneaux avec regle_id non null et statut fait/non_fait/a_refaire
    const creneauxProgression = await sbGet(
      `maternelle_creneaux?semaine_id=in.(${semaineIds})` +
      `&regle_id=not.is.null` +
      `&statut=neq.a_faire` +
      `&select=regle_id,statut,niveau` +
      `&order=regle_id.asc`
    );

    // Récupère toutes les règles de la période pour croiser
    const regles = await sbGet(
      `maternelle_regles?periode=eq.${periode.numero}` +
      `&exclu_marie=eq.false` +
      `&select=id,source,niveau,sequence_id,ordre_sequence,description,type_dispositif,est_introduction` +
      `&order=sequence_id.asc,ordre_sequence.asc`
    );

    // Construit la progression : par source+niveau, dernière règle avec statut fait
    const progressionMap = {};
    for (const cr of creneauxProgression) {
      if (!cr.regle_id) continue;
      const regle = regles.find(r => r.id === cr.regle_id);
      if (!regle) continue;
      const key = `${regle.source}__${regle.niveau}`;
      const existing = progressionMap[key];
      if (!existing || regle.ordre_sequence > existing.ordre_sequence) {
        progressionMap[key] = { ...regle, statut_derniere: cr.statut };
      }
    }

    // Calcul nb_fois_repoussee par regle_id
    const repousseeMap = {};
    for (const cr of creneauxProgression) {
      if (!cr.regle_id) continue;
      if (cr.statut === 'non_fait') {
        repousseeMap[cr.regle_id] = (repousseeMap[cr.regle_id] || 0) + 1;
      }
    }

    const progression = Object.values(progressionMap).map(r => ({
      regle_id: r.id,
      source: r.source,
      niveau: r.niveau,
      sequence_id: r.sequence_id,
      ordre_sequence: r.ordre_sequence,
      description: r.description,
      type_dispositif: r.type_dispositif,
      statut_derniere: r.statut_derniere,
      nb_fois_repoussee: repousseeMap[r.id] || 0,
      badges: r.est_introduction ? ['INTRODUCTION'] : []
    }));

    // ── 5. PROCHAINES RÈGLES disponibles par source+niveau ───────────────
    const prochainesRegles = [];
    const sourceNiveaux = [...new Set(regles.map(r => `${r.source}__${r.niveau}`))];

    for (const key of sourceNiveaux) {
      const [source, niveau] = key.split('__');
      const derniere = progressionMap[key];
      const ordreMin = derniere ? derniere.ordre_sequence : 0;

      // Règles suivantes dans l'ordre
      const suivantes = regles
        .filter(r => r.source === source && r.niveau === niveau && r.ordre_sequence > ordreMin)
        .slice(0, 5); // 5 prochaines max pour ne pas surcharger le contexte

      for (const r of suivantes) {
        prochainesRegles.push({
          regle_id: r.id,
          source: r.source,
          niveau: r.niveau,
          sequence_id: r.sequence_id,
          ordre_sequence: r.ordre_sequence,
          description: r.description,
          type_dispositif: r.type_dispositif,
          badges: r.est_introduction ? ['INTRODUCTION'] : [],
          nb_fois_repoussee: repousseeMap[r.id] || 0
        });
      }
    }

    // ── 6. LIENS INTER-MÉTHODES (fallback [] si table absente) ───────────
    let liensInterMethodes = [];
    try {
      liensInterMethodes = await sbGet(
        `maternelle_liens_methodes?select=regle_source_id,regle_cible_id,delta_positions,note`
      );
    } catch {
      // Table pas encore créée — on continue avec []
    }

    // ── 7. CONSTRUCTION DU CONTEXTE JSON ─────────────────────────────────
    const contexte = {
      periode: {
        numero: periode.numero,
        date_debut: periode.date_debut,
        date_fin: periode.date_fin
      },
      semaines: semaines.map(s => {
        const jours = [];
        if (s.a_mardi) jours.push('mardi');
        jours.push('jeudi', 'vendredi');

        const creneauxSemaine = creneauxAteliers
          .filter(c => c.semaine_id === s.id)
          .map(c => ({
            creneau_id: c.id,
            jour: c.jour,
            rotation: c.moment === 'Ateliers rotation 1' ? 'R1' : 'R2',
            role: c.role,
            niveau: c.niveau,
            regle_id_actuel: c.regle_id || null,
            activite_actuelle: c.activite || null,
            statut: c.statut,
            statut_planification: c.statut_planification
          }));

        return {
          semaine_id: s.id,
          numero: s.numero_semaine,
          date_lundi: s.date_lundi,
          a_mardi: s.a_mardi,
          jours,
          creneaux_ateliers: creneauxSemaine
        };
      }),
      progression,
      prochaines_regles: prochainesRegles,
      liens_inter_methodes: liensInterMethodes
    };

    // ── 8. APPEL API OPENAI ───────────────────────────────────────────────
    // Rappel des règles critiques injectées directement dans le message user
    const rappelRegles = `
RAPPEL IMPÉRATIF avant d'analyser les données :

1. COHÉRENCE DISPOSITIF (non-négociable) :
   - role=ENS → UNIQUEMENT type_dispositif='dirigé'
   - role=ATSEM → UNIQUEMENT type_dispositif='semi-dirigé'
   - role=AUTO → UNIQUEMENT type_dispositif='autonome'
   Violation = erreur critique. Vérifie chaque proposition avant de l'écrire.

2. COHÉRENCE NIVEAU (non-négociable) :
   - niveau=GS → UNIQUEMENT séances de niveau GS
   - niveau=PS → UNIQUEMENT séances de niveau PS

3. SEMAINE S1 — RÈGLES ABSOLUES :
   - PS : UNIQUEMENT la méthode 'ACCÈS Autour des livres TPS-PS' en S1. Aucune autre méthode PS.
   - GS : UNIQUEMENT des séances de type_dispositif='autonome' en S1. Aucune séance dirigée ou semi-dirigée GS en S1.

4. S7 : jamais de proposition sur la semaine numéro 7.

5. Pour chaque créneau, vérifie dans prochaines_regles que la regle_id proposée a bien :
   - le bon niveau (GS ou PS selon le créneau)
   - le bon type_dispositif (dirigé/semi-dirigé/autonome selon le rôle)

6. STRUCTURE OBLIGATOIRE PAR JOUR — exactement 4 créneaux distincts :
   - 1 créneau ENS GS (dirigé, niveau GS)
   - 1 créneau ATSEM PS (semi-dirigé, niveau PS)
   - 1 créneau AUTO GS (autonome, niveau GS)
   - 1 créneau AUTO PS (autonome, niveau PS)
   Les 4 rôles sont DIFFÉRENTS. Ne jamais répéter le même rôle+niveau deux fois dans la même journée.
   R1 et R2 contiennent les mêmes séances — tu n'as à proposer qu'UNE séance par rôle+niveau, pas deux.

Voici les données à analyser :
${JSON.stringify(contexte)}`;

    const anthropicRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT_MARIE },
          { role: 'user', content: rappelRegles }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`OpenAI API error : ${err}`);
    }

    const anthropicData = await anthropicRes.json();
    const texte = anthropicData.choices?.[0]?.message?.content || '{}';

    // ── 9. PARSE JSON MARIE ───────────────────────────────────────────────
    let plan;
    try {
      // Sécurité : supprime d'éventuelles balises markdown si Marie en produit
      const clean = texte.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      plan = JSON.parse(clean);
    } catch (e) {
      throw new Error(`Réponse Marie non parseable : ${texte.slice(0, 300)}`);
    }

    // ── 10. RETOUR ────────────────────────────────────────────────────────
    return res.status(200).json({ ok: true, plan });

  } catch (err) {
    console.error('api/marie-ateliers.js error:', err);
    return res.status(500).json({ error: err.message });
  }
};
