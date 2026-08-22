// api/marie-preremplir.js
// Marie pré-remplit une semaine depuis maternelle_regles
// POST /api/marie-preremplir
// Body : { semaine_id: UUID }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { semaine_id } = req.body;

  if (!semaine_id) {
    return res.status(400).json({ error: 'Paramètre semaine_id manquant' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const USER_ID = '6c1b1768-457b-4777-b1d9-a309f2fe2cef';

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  // Objet créneau uniforme — toutes les clés présentes dans tous les objets
  function makeCreneau(overrides) {
    return {
      semaine_id,
      user_id: USER_ID,
      jour: null,
      heure_debut: null,
      heure_fin: null,
      moment: null,
      type: 'variable',
      titre_fixe: null,
      niveau: null,
      periode: null,
      activite: null,
      regle_id: null,
      notes: null,
      lien_programme: null,
      role: null,
      groupe: null,
      ...overrides
    };
  }

  try {
    // 1. Récupérer la semaine
    const resSemaine = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_semaines?id=eq.${semaine_id}&select=id,numero_semaine,a_mardi,periode_id`,
      { headers }
    );
    const semaines = await resSemaine.json();
    if (!semaines.length) return res.status(404).json({ error: 'Semaine introuvable' });
    const semaine = semaines[0];

    // 2. Récupérer la période
    const resPeriode = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_periodes?id=eq.${semaine.periode_id}&select=numero`,
      { headers }
    );
    const periodes = await resPeriode.json();
    if (!periodes.length) return res.status(404).json({ error: 'Période introuvable' });
    const numPeriode = periodes[0].numero;

    // 3. Numéro MHM réel (offset -1 : S1 app = rentrée MHM, S2 app = S1 MHM...)
    const numMHM = semaine.numero_semaine - 1;

    // 4. Jours actifs
    const jours = [];
    if (semaine.a_mardi) jours.push('mardi');
    jours.push('jeudi');
    jours.push('vendredi');

    // 5. Récupérer les règles MHM pour cette période
    const resRegles = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_regles?periode=eq.${numPeriode}&select=id,niveau,frequence_type,frequence_valeur,description,domaine_id,sous_domaine_id`,
      { headers }
    );
    const regles = await resRegles.json();

    // 6. Vérifier absence de créneaux existants
    const resExistants = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?semaine_id=eq.${semaine_id}&select=id`,
      { headers }
    );
    const existants = await resExistants.json();
    if (existants.length > 0) {
      return res.status(409).json({
        error: 'Des créneaux existent déjà pour cette semaine.'
      });
    }

    // 7. Récupérer le template fixe
    const resTemplate = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux_template?user_id=eq.${USER_ID}&type=eq.fixe&select=*`,
      { headers }
    );
    const template = await resTemplate.json();

    // 8. Générer les créneaux
    const creneauxAInserer = [];

    // --- CRÉNEAUX FIXES ---
    for (const jour of jours) {
      for (const tmpl of template) {
        creneauxAInserer.push(makeCreneau({
          jour,
          heure_debut: tmpl.heure_debut,
          heure_fin: tmpl.heure_fin,
          moment: tmpl.moment,
          type: 'fixe',
          titre_fixe: tmpl.moment,
          niveau: tmpl.niveau || null,
          periode: heureToPeriode(tmpl.heure_debut)
        }));
      }
    }

    // --- CRÉNEAUX VARIABLES : rituels MHM ---
    const jourToIndex = {};
    jours.forEach((j, i) => { jourToIndex[j] = i + 1; });

    const reglesQuotidiennes = regles.filter(r => r.frequence_type === 'quotidien');
    const reglesHebdo = regles.filter(r => r.frequence_type === 'hebdomadaire');

    for (const jour of jours) {
      const numJour = jourToIndex[jour];

      // Règles quotidiennes
      for (const regle of reglesQuotidiennes) {
        const horaire = deduireHoraire(regle);
        creneauxAInserer.push(makeCreneau({
          jour,
          heure_debut: horaire.debut,
          heure_fin: horaire.fin,
          moment: horaire.moment,
          type: 'variable',
          niveau: regle.niveau,
          periode: heureToPeriode(horaire.debut),
          regle_id: regle.id,
          lien_programme: regle.sous_domaine_id
        }));
      }

      // Règles du jour spécifique
      const reglesDuJour = reglesHebdo.filter(r =>
        r.frequence_valeur === null || r.frequence_valeur === numJour
      );

      for (const regle of reglesDuJour) {
        const horaire = deduireHoraire(regle);
        creneauxAInserer.push(makeCreneau({
          jour,
          heure_debut: horaire.debut,
          heure_fin: horaire.fin,
          moment: horaire.moment,
          type: 'variable',
          niveau: regle.niveau,
          periode: heureToPeriode(horaire.debut),
          regle_id: regle.id,
          lien_programme: regle.sous_domaine_id
        }));
      }
    }

    // 9. Insertion batch
    if (creneauxAInserer.length > 0) {
      const resInsert = await fetch(
        `${SUPABASE_URL}/rest/v1/maternelle_creneaux`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(creneauxAInserer)
        }
      );

      if (!resInsert.ok) {
        const errBody = await resInsert.text();
        throw new Error(`Erreur insertion créneaux : ${errBody}`);
      }
    }

    return res.status(200).json({
      ok: true,
      semaine_id,
      jours_actifs: jours,
      creneaux_inseres: creneauxAInserer.length,
      num_mhm: numMHM
    });

  } catch (err) {
    console.error('api/marie-preremplir.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Détermine matin ou aprem
function heureToPeriode(heureDebut) {
  if (!heureDebut) return 'matin';
  const h = parseInt(heureDebut.split(':')[0], 10);
  return h < 13 ? 'matin' : 'aprem';
}

// Déduit l'horaire depuis la description de la règle
function deduireHoraire(regle) {
  const desc = regle.description.toLowerCase();

  if (desc.includes('rituel')) {
    return { debut: '08:40', fin: '09:20', moment: 'Rituels maths' };
  }
  if (desc.includes('atelier') || desc.includes('temps 1') || desc.includes('temps 2')) {
    return { debut: '08:50', fin: '10:00', moment: 'Ateliers' };
  }
  if (desc.includes('auto') || desc.includes('autonome')) {
    return { debut: '14:00', fin: '14:30', moment: 'Activités autonomes' };
  }
  return { debut: '11:00', fin: '11:30', moment: 'Divers' };
}
