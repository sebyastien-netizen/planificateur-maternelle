// api/marie-ateliers.js
// Moteur de proposition ateliers — Marie
// POST /api/marie-ateliers
// Body : { periode_id: UUID }
// Retourne : { ok: true, plan: { semaines: [...] } }
// Stratégie : 2 appels séquentiels (S1-S3 puis S4-S6), R1 uniquement

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MARIE_MODEL = process.env.MARIE_MODEL || 'gpt-4o';
const USER_ID = '6c1b1768-457b-4777-b1d9-a309f2fe2cef';

const PROMPT_MARIE = `Tu es Marie, moteur pédagogique du Planificateur Maternelle. Tu planifies les créneaux ateliers d'une enseignante PS/GS.

## BLOC 1 — FORMAT DE SORTIE

JSON uniquement — pas de texte avant, pas de balises markdown. Structure exacte :

{
  "semaines": [{
    "semaine_id": "uuid",
    "numero": 1,
    "jours": [{
      "jour": "jeudi",
      "date": "2026-09-03",
      "explication": "2 à 4 phrases pédagogiques justifiant les choix du jour.",
      "conseil": "1 conseil actionnable pour l'enseignante.",
      "creneaux": [{
        "creneau_id": "uuid",
        "regle_id": "id-ou-null",
        "proposition": "Méthode — Séance X : Description",
        "methode": "Nom méthode",
        "niveau": "GS",
        "role": "ENS",
        "rotation": "R1",
        "position_sequence": 1,
        "regles_appliquees": ["R5", "R8"],
        "justification": "Prochaine dans l'ordre de la séquence",
        "type": "proposition",
        "conflit": null
      }]
    }]
  }]
}

Règles de format absolues :
- type : "proposition" / "vide" / "conflit"
- Si type="vide" : regle_id=null, proposition=null
- Si type="conflit" : renseigne conflit.message, conflit.severite ("bloquant"/"avertissement"), conflit.regle_violee
- regles_appliquees : toujours un tableau, jamais null
- Ne jamais retourner {"semaines":[]} — toujours produire une entrée par semaine reçue
- Commence directement par { sans aucun texte avant

## BLOC 2 — STRUCTURE D'UN JOUR (non négociable)

Chaque jour contient EXACTEMENT 4 créneaux distincts, dans cet ordre :
1. ENS GS → séance type_dispositif="dirigé", niveau="GS"
2. ATSEM PS → séance type_dispositif="semi-dirigé", niveau="PS"
3. AUTO GS → séance type_dispositif="autonome", niveau="GS"
4. AUTO PS → séance type_dispositif="autonome", niveau="PS"

Ne jamais répéter le même rôle+niveau. Ne jamais croiser les niveaux.

## BLOC 3 — ALGORITHME PAR CRÉNEAU

Pour chaque créneau vide, raisonne dans cet ordre :

1. FILTRE : dans prochaines_regles, ne retiens que les règles avec le bon niveau ET le bon type_dispositif
2. PRIORITÉ : séances en_attente > repoussées ≥3 fois > prochaine dans l'ordre de la séquence
3. ÉQUILIBRE : évite de surcharger une méthode sur la semaine — alterne si possible (R29)
4. VALIDATION : vérifie les règles fixes ci-dessous
5. PLACE ou DÉCLARE VIDE : si aucune séance valide → type="vide" avec justification explicite

## BLOC 4 — RÈGLES FIXES (violations = type="conflit")

- R1-R2 : ordre strict dans la séquence — jamais de saut, jamais de retour en arrière
- R5-R7 : cohérence rôle/dispositif — ENS=dirigé, ATSEM=semi-dirigé, AUTO=autonome
- R8-R9 : cohérence niveau — GS→GS uniquement, PS→PS uniquement
- R21 : badge SUITE — vérifier que le prérequis est statut="fait" avant de placer
- R25 : créneau avec regle_id_actuel != null = déjà occupé → ne pas inclure dans la réponse
- R26 : une seule séance par créneau, jamais deux

Cas spéciaux semaine S1 (numero=1) :
- R15 : PS → méthode "ACCÈS Autour des livres TPS-PS" uniquement
- R16 : GS → créneau ENS GS obligatoirement type="vide"

Cas spécial semaine S6 (numero=6) :
- R17 : éviter de commencer une nouvelle séquence qu'on ne pourrait pas terminer

## BLOC 5 — RÈGLES AJUSTABLES

- R29 : équilibre des méthodes sur la semaine — ne pas surcharger une méthode
- R30 : équilibre GS/PS — si les GS ont nettement plus de séances, comble les PS en priorité
- R31 : badge À_RÉITÉRER → planifier deux fois avant de passer à la suivante
- R32 : badge SI_TEMPS → uniquement si tous les créneaux obligatoires sont remplis
- R34 : justification parmi : "Prochaine dans l'ordre de la séquence" / "Repoussée depuis S[N]" / "Prérequis de la séance suivante" / "Dernier créneau disponible avant S7" / "Lien inter-méthodes — delta atteint"

## BLOC 6 — LIENS INTER-MÉTHODES (si liens_inter_methodes non vide)

- La séance cible est débloquée quand position_source_actuelle >= position_cible + delta_positions
- Si ce seuil est atteint → propose la séance cible, justification = "Lien inter-méthodes — delta atteint"
- Si l'écart réel dépasse le delta attendu → type="conflit", severite="avertissement", signale la divergence

## BLOC 7 — PROGRESSION INTER-SEMAINES

- Ne jamais proposer la même séance deux jours différents dans la même semaine (R35)
- Si la séance N est placée mardi → propose N+1 jeudi → N+2 vendredi
- La progression reçue indique la dernière séance faite par méthode/niveau — repars de là`;

// ── Fonction appel API Marie (Anthropic ou OpenAI) ────────────────────
async function appelMarie(promptUser, tokensMax) {
  const isAnthropic = MARIE_MODEL.startsWith('claude');

  if (isAnthropic) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MARIE_MODEL,
        max_tokens: tokensMax,
        system: PROMPT_MARIE,
        messages: [{ role: 'user', content: promptUser }]
      })
    });
    if (!r.ok) throw new Error(`Anthropic API error : ${await r.text()}`);
    const data = await r.json();
    return {
      texte: data.content?.[0]?.text || '{}',
      tokensInput: data.usage?.input_tokens || 0,
      tokensOutput: data.usage?.output_tokens || 0
    };

  } else {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MARIE_MODEL,
        max_tokens: tokensMax,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT_MARIE },
          { role: 'user', content: promptUser }
        ]
      })
    });
    if (!r.ok) throw new Error(`OpenAI API error : ${await r.text()}`);
    const data = await r.json();
    return {
      texte: data.choices?.[0]?.message?.content || '{}',
      tokensInput: data.usage?.prompt_tokens || 0,
      tokensOutput: data.usage?.completion_tokens || 0
    };
  }
}

// ── Parse JSON Marie avec nettoyage markdown ──────────────────────────
function parseMarieJson(texte) {
  const clean = texte.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

// ── Construit le rappel de règles + contexte pour un bloc de semaines ─
function buildPrompt(periode, semainesBloc, creneauxAteliers, progression, prochainesRegles, liensInterMethodes, label) {
  const contexte = {
    periode: {
      numero: periode.numero,
      date_debut: periode.date_debut,
      date_fin: periode.date_fin
    },
    semaines: semainesBloc.map(s => {
      const jours = [];
      if (s.a_mardi) jours.push('mardi');
      jours.push('jeudi', 'vendredi');

      // R1 uniquement — R2 identique, l'enseignante le remplit elle-même
      const creneauxSemaine = creneauxAteliers
        .filter(c => c.semaine_id === s.id && c.moment === 'Ateliers rotation 1')
        .map(c => ({
          creneau_id: c.id,
          jour: c.jour,
          rotation: 'R1',
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

  return `
RAPPEL IMPÉRATIF — vérifie chaque point avant d'écrire ta réponse :

1. COHÉRENCE DISPOSITIF (non-négociable) :
   - role=ENS → UNIQUEMENT type_dispositif='dirigé'
   - role=ATSEM → UNIQUEMENT type_dispositif='semi-dirigé'
   - role=AUTO → UNIQUEMENT type_dispositif='autonome'
   Violation = erreur critique.

2. COHÉRENCE NIVEAU (non-négociable) :
   - niveau=GS → UNIQUEMENT séances de niveau GS
   - niveau=PS → UNIQUEMENT séances de niveau PS

3. SEMAINE S1 — RÈGLES ABSOLUES :
   - PS : UNIQUEMENT la méthode 'ACCÈS Autour des livres TPS-PS' en S1. Aucune autre méthode PS.
   - GS : UNIQUEMENT des séances de type_dispositif='autonome' en S1. Le créneau ENS GS doit être type="vide" en S1.

4. S7 : jamais de proposition sur la semaine numéro 7.

5. VÉRIFICATION PAR CRÉNEAU : pour chaque proposition, vérifie dans prochaines_regles que la regle_id a bien le bon niveau ET le bon type_dispositif. Si aucune séance du bon type n'est disponible → type="vide".

6. STRUCTURE PAR JOUR — exactement 4 créneaux distincts :
   - 1 × ENS GS (dirigé, GS)
   - 1 × ATSEM PS (semi-dirigé, PS)
   - 1 × AUTO GS (autonome, GS)
   - 1 × AUTO PS (autonome, PS)
   Ne jamais répéter le même rôle+niveau deux fois dans la même journée.

7. JOURS OBLIGATOIRES : produis une entrée pour CHAQUE jour listé dans "jours" de chaque semaine. Si jours=["mardi","jeudi","vendredi"], ta réponse doit avoir 3 objets dans "jours". Ne jamais omettre un jour.

8. PROGRESSION HEBDOMADAIRE CONTINUE : sur une même semaine, ne jamais proposer deux fois la même séance sur deux jours différents. Chaque jour doit faire avancer la progression dans la méthode — si la séance N est placée le mardi, propose la séance N+1 le jeudi, puis N+2 le vendredi (si le dispositif et le niveau le permettent). Ne jamais stationner sur la même séance plusieurs jours d'affilée.

9. TYPE VIDE : si aucune séance disponible ou mauvais type_dispositif → utilise type="vide" avec proposition=null et regle_id=null. Ne jamais mettre type="proposition" avec proposition=null ou "—". Un créneau sans séance valide est toujours type="vide" avec une justification claire. En S1 spécifiquement, le créneau AUTO PS doit être type="vide" car les séances autonomes PS d'Autour des livres n'apparaissent qu'en milieu de séquence.

10. CRÉNEAUX DÉJÀ REMPLIS : un créneau avec regle_id_actuel != null OU activite_actuelle != null est déjà occupé. Tu ne proposes RIEN dessus. Ne l'inclus pas dans ta réponse du tout — saute-le. Si la séance déjà placée viole une règle → inclus-le avec type="conflit" uniquement. Ne jamais écraser une séance déjà placée manuellement par l'enseignante.

11. UNICITÉ DES CRENEAU_ID : chaque creneau_id dans ta réponse doit être unique sur l'ensemble du plan. Ne jamais réutiliser le même creneau_id dans deux jours ou deux semaines différentes.

12. BLOC TRAITÉ : tu traites UNIQUEMENT les semaines ${label}. Ne produis des entrées que pour ces semaines.

Voici les données à analyser :
${JSON.stringify(contexte)}`;
}

// ── Mise à jour de la progression après un plan partiel ──────────────
function mettreAJourProgression(planPartiel, progression, prochainesRegles, regles) {
  for (const semaine of planPartiel.semaines || []) {
    for (const jour of semaine.jours || []) {
      for (const c of jour.creneaux || []) {
        if (c.type !== 'proposition' || !c.regle_id) continue;
        const regle = regles.find(r => r.id === c.regle_id);
        if (!regle) continue;
        const key = `${regle.source}__${regle.niveau}`;
        const existant = progression.find(p => p.source === regle.source && p.niveau === regle.niveau);
        if (!existant) {
          progression.push({
            regle_id: regle.id,
            source: regle.source,
            niveau: regle.niveau,
            sequence_id: regle.sequence_id,
            ordre_sequence: regle.ordre_sequence,
            description: regle.description,
            type_dispositif: regle.type_dispositif,
            statut_derniere: 'a_faire',
            nb_fois_repoussee: 0,
            badges: regle.est_introduction ? ['INTRODUCTION'] : []
          });
        } else if (regle.ordre_sequence > existant.ordre_sequence) {
          existant.regle_id = regle.id;
          existant.ordre_sequence = regle.ordre_sequence;
          existant.description = regle.description;
        }

        // Retirer la règle posée des prochaines_regles et avancer la fenêtre
        const idx = prochainesRegles.findIndex(r => r.regle_id === c.regle_id);
        if (idx !== -1) prochainesRegles.splice(idx, 1);
      }
    }
  }

  // Recompléter prochaines_regles jusqu'à 5 par source+niveau
  const sourceNiveaux = [...new Set(regles.map(r => `${r.source}__${r.niveau}`))];
  for (const key of sourceNiveaux) {
    const [source, niveau] = key.split('__');
    const derniere = progression.find(p => p.source === source && p.niveau === niveau);
    const ordreMin = derniere ? derniere.ordre_sequence : 0;
    const dejaDans = prochainesRegles.filter(r => r.source === source && r.niveau === niveau).length;
    const manquantes = 5 - dejaDans;
    if (manquantes <= 0) continue;
    const aAjouter = regles
      .filter(r => r.source === source && r.niveau === niveau && r.ordre_sequence > ordreMin)
      .filter(r => !prochainesRegles.find(pr => pr.regle_id === r.id))
      .slice(0, manquantes);
    for (const r of aAjouter) {
      prochainesRegles.push({
        regle_id: r.id,
        source: r.source,
        niveau: r.niveau,
        sequence_id: r.sequence_id,
        ordre_sequence: r.ordre_sequence,
        description: r.description,
        type_dispositif: r.type_dispositif,
        badges: r.est_introduction ? ['INTRODUCTION'] : [],
        nb_fois_repoussee: 0
      });
    }
  }
}

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

    // ── 2. SEMAINES S1→S6 (S7 exclue) ───────────────────────────────────
    const semaines = await sbGet(
      `maternelle_semaines?periode_id=eq.${periode_id}&numero_semaine=lt.7&select=id,numero_semaine,date_lundi,a_mardi&order=numero_semaine.asc`
    );

    // ── 3. CRÉNEAUX ATELIERS — R1 uniquement ─────────────────────────────
    const semaineIds = semaines.map(s => s.id).join(',');
    const creneauxAteliers = await sbGet(
      `maternelle_creneaux?semaine_id=in.(${semaineIds})` +
      `&moment=eq.Ateliers rotation 1` +
      `&statut_planification=eq.actif` +
      `&select=id,semaine_id,jour,moment,role,niveau,regle_id,activite,statut,statut_planification` +
      `&order=jour.asc,moment.asc`
    );

    // ── 4. PROGRESSION ───────────────────────────────────────────────────
    const creneauxProgression = await sbGet(
      `maternelle_creneaux?semaine_id=in.(${semaineIds})` +
      `&regle_id=not.is.null` +
      `&statut=neq.a_faire` +
      `&select=regle_id,statut,niveau` +
      `&order=regle_id.asc`
    );

    const regles = await sbGet(
      `maternelle_regles?periode=eq.${periode.numero}` +
      `&exclu_marie=eq.false` +
      `&select=id,source,niveau,sequence_id,ordre_sequence,description,type_dispositif,est_introduction` +
      `&order=sequence_id.asc,ordre_sequence.asc`
    );

    const progressionMap = {};
    const repousseeMap = {};
    for (const cr of creneauxProgression) {
      if (!cr.regle_id) continue;
      const regle = regles.find(r => r.id === cr.regle_id);
      if (!regle) continue;
      const key = `${regle.source}__${regle.niveau}`;
      const existing = progressionMap[key];
      if (!existing || regle.ordre_sequence > existing.ordre_sequence) {
        progressionMap[key] = { ...regle, statut_derniere: cr.statut };
      }
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

    // ── 5. PROCHAINES RÈGLES — fenêtre de 5 par source+niveau ────────────
    const prochainesRegles = [];
    const sourceNiveaux = [...new Set(regles.map(r => `${r.source}__${r.niveau}`))];
    for (const key of sourceNiveaux) {
      const [source, niveau] = key.split('__');
      const derniere = progressionMap[key];
      const ordreMin = derniere ? derniere.ordre_sequence : 0;
const toutesLesRegles = regles
  .filter(r => r.source === source && r.niveau === niveau && r.ordre_sequence > ordreMin);

// Au moins 1 par type_dispositif, jusqu'à 5 au total
const dispositifs = ['dirigé', 'semi-dirigé', 'autonome'];
const suivantes = [];
for (const disp of dispositifs) {
  const premiere = toutesLesRegles.find(r => r.type_dispositif === disp && !suivantes.includes(r));
  if (premiere) suivantes.push(premiere);
}
// Compléter jusqu'à 5 avec les suivantes dans l'ordre
for (const r of toutesLesRegles) {
  if (suivantes.length >= 5) break;
  if (!suivantes.includes(r)) suivantes.push(r);
}
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

    // ── 6. LIENS INTER-MÉTHODES ───────────────────────────────────────────
    let liensInterMethodes = [];
    try {
      liensInterMethodes = await sbGet(
        `maternelle_liens_methodes?select=regle_source_id,regle_cible_id,delta_positions,note`
      );
    } catch {
      // Table pas encore créée — on continue avec []
    }

    // ── 7. DÉCOUPAGE EN 2 BLOCS ───────────────────────────────────────────
    const bloc1 = semaines.filter(s => s.numero_semaine <= 3); // S1-S2-S3
    const bloc2 = semaines.filter(s => s.numero_semaine >= 4); // S4-S5-S6

    // ── 8. APPEL 1 — S1-S2-S3 ────────────────────────────────────────────
    const prompt1 = buildPrompt(periode, bloc1, creneauxAteliers, progression, prochainesRegles, liensInterMethodes, 'S1, S2 et S3');

    let plan1;
    try {
      plan1 = parseMarieJson(texte1);
    } catch (e) {
      throw new Error(`Réponse Marie bloc S1-S3 non parseable : ${texte1.slice(0, 300)}`);
    }

    // Mise à jour progression + prochaines_regles avant le 2ème appel
    mettreAJourProgression(plan1, progression, prochainesRegles, regles);

    // ── 9. APPEL 2 — S4-S5-S6 ────────────────────────────────────────────
    const prompt2 = buildPrompt(periode, bloc2, creneauxAteliers, progression, prochainesRegles, liensInterMethodes, 'S4, S5 et S6');
    const { texte: texte2, tokensInput: ti2, tokensOutput: to2 } = await appelMarie(prompt2, 8000);

    let plan2;
    try {
      plan2 = parseMarieJson(texte2);
    } catch (e) {
      throw new Error(`Réponse Marie bloc S4-S6 non parseable : ${texte2.slice(0, 300)}`);
    }

    // ── 10. FUSION DES DEUX PLANS ─────────────────────────────────────────
    const plan = {
      semaines: [
        ...(plan1.semaines || []),
        ...(plan2.semaines || [])
      ]
    };

    const tokensInput = ti1 + ti2;
    const tokensOutput = to1 + to2;

    // ── 11. SAUVEGARDE ────────────────────────────────────────────────────
    await fetch(`${SUPABASE_URL}/rest/v1/maternelle_plans_marie`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: USER_ID,
        periode_id: periode_id,
        modele: MARIE_MODEL,
        plan_json: plan,
        tokens_input: tokensInput,
        tokens_output: tokensOutput
      })
    });

    // ── 12. RETOUR ────────────────────────────────────────────────────────
    return res.status(200).json({ ok: true, plan });

  } catch (err) {
    console.error('api/marie-ateliers.js error:', err);
    return res.status(500).json({ error: err.message });
  }
};
