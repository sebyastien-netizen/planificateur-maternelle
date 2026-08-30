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
1. ENS GS -> séance type_dispositif="dirigé", niveau="GS"
2. ATSEM PS -> séance type_dispositif="semi-dirigé", niveau="PS"
3. AUTO GS -> séance type_dispositif="autonome", niveau="GS"
4. AUTO PS -> séance type_dispositif="autonome", niveau="PS"

Ne jamais répéter le même rôle+niveau. Ne jamais croiser les niveaux.

## BLOC 3 — ALGORITHME PAR CRÉNEAU

Pour chaque créneau vide, raisonne dans cet ordre :

1. FILTRE : dans SÉANCES DISPONIBLES, ne retiens que les séances avec le bon niveau ET le bon type_dispositif
2. PRIORITÉ : séances en_attente > repoussées 3 fois ou plus > prochaine dans l'ordre de la séquence
3. ÉQUILIBRE : évite de surcharger une méthode sur la semaine — alterne si possible
4. VALIDATION : vérifie les règles fixes ci-dessous
5. PLACE ou DÉCLARE VIDE : si aucune séance valide -> type="vide" avec justification explicite

## BLOC 4 — RÈGLES FIXES

- R1-R2 : ordre strict dans la séquence — jamais de saut, jamais de retour en arrière
- R5-R7 : cohérence rôle/dispositif — ENS=dirigé, ATSEM=semi-dirigé, AUTO=autonome
- R8-R9 : cohérence niveau — GS vers GS uniquement, PS vers PS uniquement
- R21 : badge SUITE — vérifier que le prérequis est statut="fait" avant de placer
- R25 : créneau déjà occupé (regle_id_actuel non null) -> ne pas inclure dans la réponse
- R26 : une seule séance par créneau

Cas spéciaux semaine S1 (numero=1) :
- R15 : PS -> méthode "ACCÈS Autour des livres TPS-PS" uniquement
- R16 : GS -> créneau ENS GS obligatoirement type="vide"

Cas spécial semaine S6 (numero=6) :
- R17 : éviter de commencer une nouvelle séquence qu'on ne pourrait pas terminer

## BLOC 5 — RÈGLES AJUSTABLES

- R29 : équilibre des méthodes sur la semaine — ne pas surcharger une méthode
- R30 : équilibre GS/PS — si les GS ont nettement plus de séances, comble les PS en priorité
- R31 : badge A_REITERER -> planifier deux fois avant de passer à la suivante
- R32 : badge SI_TEMPS -> uniquement si tous les créneaux obligatoires sont remplis
- R34 : justification parmi : "Prochaine dans l'ordre de la séquence" / "Repoussée depuis S[N]" / "Prérequis de la séance suivante" / "Dernier créneau disponible avant S7" / "Lien inter-méthodes — delta atteint"

## BLOC 6 — LIENS INTER-MÉTHODES (si présents)

- La séance cible est débloquée quand position_source_actuelle >= position_cible + delta_positions
- Si ce seuil est atteint -> propose la séance cible, justification = "Lien inter-méthodes — delta atteint"
- Si l'écart réel dépasse le delta attendu -> type="conflit", severite="avertissement"

## BLOC 7 — PROGRESSION INTER-SEMAINES

- Ne jamais proposer la même séance deux jours différents dans la même semaine
- Si la séance N est placée mardi -> propose N+1 jeudi -> N+2 vendredi
- La PROGRESSION ACTUELLE indique la dernière séance faite par méthode/niveau — repars de là`;

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
    const clean = texte
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(clean);
}

// ── Construit le prompt pour un bloc de semaines ──────────────────────
function buildPrompt(periode, semainesBloc, creneauxAteliers, progression, prochainesRegles, liensInterMethodes, label) {

  const lignesCreneaux = [];
  for (const s of semainesBloc) {
    const jours = [];
    if (s.a_mardi) jours.push('mardi');
    jours.push('jeudi', 'vendredi');

    const creneauxSemaine = creneauxAteliers
      .filter(c => c.semaine_id === s.id && c.moment === 'Ateliers rotation 1')
      .map(c => ({
        creneau_id: c.id,
        jour: c.jour,
        role: c.role,
        niveau: c.niveau,
        regle_id_actuel: c.regle_id || null,
        activite_actuelle: c.activite || null
      }));

    const creneauxVides = creneauxSemaine.filter(c => !c.regle_id_actuel && !c.activite_actuelle);

        lignesCreneaux.push(`S${s.numero_semaine} — semaine_id=${s.id} — lundi ${s.date_lundi} — jours : ${jours.join(', ')}`);
    if (creneauxVides.length === 0) {
      lignesCreneaux.push('  (tous les créneaux sont déjà remplis)');
    } else {
      for (const c of creneauxVides) {
        lignesCreneaux.push(`  - creneau_id=${c.creneau_id} | jour=${c.jour} | role=${c.role} | niveau=${c.niveau}`);
      }
    }
  }

  const lignesProgression = progression.length
    ? progression.map(p => `  - ${p.source} ${p.niveau} : dernière séance ordre ${p.ordre_sequence} — ${p.statut_derniere}`)
    : ['  Aucune séance faite — début de période'];

  const lignesSeances = prochainesRegles.map(r =>
    `  - [${r.regle_id}] ${r.source} | ${r.niveau} | ${r.type_dispositif} | ordre ${r.ordre_sequence} : ${r.description}`
  );

  const lignesLiens = liensInterMethodes.length
    ? liensInterMethodes.map(l => `  - ${l.regle_source_id} -> ${l.regle_cible_id} (delta ${l.delta_positions}) : ${l.note}`)
    : ['  Aucun lien inter-méthodes'];

  return `Tu dois planifier les créneaux ateliers pour les semaines ${label} de la Période ${periode.numero} (${periode.date_debut} -> ${periode.date_fin}).

CRÉNEAUX À REMPLIR :
${lignesCreneaux.join('\n')}

PROGRESSION ACTUELLE (dernière séance faite par méthode) :
${lignesProgression.join('\n')}

SÉANCES DISPONIBLES :
${lignesSeances.join('\n')}

LIENS INTER-MÉTHODES :
${lignesLiens.join('\n')}

Produis le JSON de planification pour ces semaines uniquement. Chaque semaine doit apparaître dans ta réponse même si tous ses créneaux sont vides (utilise type="vide" dans ce cas).`;
}

// ── Mise à jour de la progression après un plan partiel ──────────────
function mettreAJourProgression(planPartiel, progression, prochainesRegles, regles) {
  for (const semaine of planPartiel.semaines || []) {
    for (const jour of semaine.jours || []) {
      for (const c of jour.creneaux || []) {
        if (c.type !== 'proposition' || !c.regle_id) continue;
        const regle = regles.find(r => r.id === c.regle_id);
        if (!regle) continue;
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
        const idx = prochainesRegles.findIndex(r => r.regle_id === c.regle_id);
        if (idx !== -1) prochainesRegles.splice(idx, 1);
      }
    }
  }

  // Recompléter prochaines_regles jusqu'à 5 par source+niveau avec diversité de dispositifs
  const sourceNiveaux = [...new Set(regles.map(r => `${r.source}__${r.niveau}`))];
  for (const key of sourceNiveaux) {
    const [source, niveau] = key.split('__');
    const derniere = progression.find(p => p.source === source && p.niveau === niveau);
    const ordreMin = derniere ? derniere.ordre_sequence : 0;
    const dejaDans = prochainesRegles.filter(r => r.source === source && r.niveau === niveau).length;
    const manquantes = 5 - dejaDans;
    if (manquantes <= 0) continue;
    const disponibles = regles
      .filter(r => r.source === source && r.niveau === niveau && r.ordre_sequence > ordreMin)
      .filter(r => !prochainesRegles.find(pr => pr.regle_id === r.id));
    const aAjouter = [];
    for (const disp of ['dirigé', 'semi-dirigé', 'autonome']) {
      const r = disponibles.find(r => r.type_dispositif === disp && !aAjouter.includes(r));
      if (r) aAjouter.push(r);
    }
    for (const r of disponibles) {
      if (aAjouter.length >= manquantes) break;
      if (!aAjouter.includes(r)) aAjouter.push(r);
    }
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

    // ── 2. SEMAINES S1->S6 (S7 exclue) ───────────────────────────────────
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

    // ── 5. PROCHAINES RÈGLES — fenêtre avec diversité de dispositifs ─────
    const prochainesRegles = [];
    const sourceNiveaux = [...new Set(regles.map(r => `${r.source}__${r.niveau}`))];
    for (const key of sourceNiveaux) {
      const [source, niveau] = key.split('__');
      const derniere = progressionMap[key];
      const ordreMin = derniere ? derniere.ordre_sequence : 0;
      const toutes = regles.filter(r => r.source === source && r.niveau === niveau && r.ordre_sequence > ordreMin);
      const suivantes = [];
      for (const disp of ['dirigé', 'semi-dirigé', 'autonome']) {
        const r = toutes.find(r => r.type_dispositif === disp);
        if (r) suivantes.push(r);
      }
      for (const r of toutes) {
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
    const { texte: texte1, tokensInput: ti1, tokensOutput: to1 } = await appelMarie(prompt1, 8000);

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
