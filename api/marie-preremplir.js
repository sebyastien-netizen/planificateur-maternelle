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

  try {
    // 1. Récupérer la semaine (numero_semaine, a_mardi, periode_id)
    const resSemaine = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_semaines?id=eq.${semaine_id}&select=id,numero_semaine,a_mardi,periode_id`,
      { headers }
    );
    const semaines = await resSemaine.json();
    if (!semaines.length) return res.status(404).json({ error: 'Semaine introuvable' });
    const semaine = semaines[0];

    // 2. Récupérer la période pour connaître le numéro (1, 2, 3...)
    const resPeriode = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_periodes?id=eq.${semaine.periode_id}&select=numero`,
      { headers }
    );
    const periodes = await resPeriode.json();
    if (!periodes.length) return res.status(404).json({ error: 'Période introuvable' });
    const numPeriode = periodes[0].numero;

    // 3. Calculer le numéro MHM réel
    // Dans l'app : S1 = semaine rentrée MHM, S2 = S1 MHM, etc.
    // Marie lit les règles avec le bon offset
    const numMHM = semaine.numero_semaine - 1; // 0 = rentrée, 1 = S1 MHM, etc.

    // 4. Déterminer les jours actifs
    // Lundi toujours décoché (décharge direction)
    // Mardi selon a_mardi
    const jours = [];
    if (semaine.a_mardi) jours.push('mardi');
    jours.push('jeudi');
    jours.push('vendredi');

    // 5. Récupérer les règles MHM pour cette période et ces niveaux
    const resRegles = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_regles?periode=eq.${numPeriode}&select=id,niveau,frequence_type,frequence_valeur,description,domaine_id,sous_domaine_id`,
      { headers }
    );
    const regles = await resRegles.json();

    // 6. Vérifier si des créneaux existent déjà pour cette semaine
    const resExistants = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?semaine_id=eq.${semaine_id}&select=id`,
      { headers }
    );
    const existants = await resExistants.json();
    if (existants.length > 0) {
      return res.status(409).json({
        error: 'Des créneaux existent déjà pour cette semaine. Supprimez-les avant de pré-remplir.'
      });
    }

    // 7. Construire les créneaux fixes depuis le template
    const resTemplate = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux_template?user_id=eq.${USER_ID}&type=eq.fixe&select=*`,
      { headers }
    );
    const template = await resTemplate.json();

    // 8. Générer les créneaux à insérer
    const creneauxAInserer = [];

    // --- CRÉNEAUX FIXES : un par jour actif ---
    for (const jour of jours) {
      for (const tmpl of template) {
        creneauxAInserer.push({
          semaine_id,
          user_id: USER_ID,
          jour,
          heure_debut: tmpl.heure_debut,
          heure_fin: tmpl.heure_fin,
          moment: tmpl.moment,
          type: 'fixe',
          titre_fixe: tmpl.moment,
          niveau: tmpl.niveau,
          periode: heureToPeriode(tmpl.heure_debut)
        });
      }
    }

    // --- CRÉNEAUX VARIABLES : rituels MHM par jour ---
    // Mapping jour → numéro de jour MHM (J1, J2, J3...)
    const jourToIndex = {};
    jours.forEach((j, i) => { jourToIndex[j] = i + 1; });

    // Règles quotidiennes → tous les jours
    const reglesQuotidiennes = regles.filter(r => r.frequence_type === 'quotidien');

    // Règles hebdomadaires → selon le jour (frequence_valeur = numéro du jour)
    const reglesHebdo = regles.filter(r => r.frequence_type === 'hebdomadaire');

    for (const jour of jours) {
      const numJour = jourToIndex[jour];

      // Rituels quotidiens (étiquette d'appel, etc.)
      for (const regle of reglesQuotidiennes) {
        creneauxAInserer.push(buildCreneau(semaine_id, USER_ID, jour, regle, numMHM));
      }

      // Rituels du jour spécifique (mascotte J1, personnages J2, etc.)
      const reglesDuJour = reglesHebdo.filter(r => {
        // frequence_valeur null = toutes les semaines, sinon = numéro du jour
        return r.frequence_valeur === null || r.frequence_valeur === numJour;
      });

      for (const regle of reglesDuJour) {
        creneauxAInserer.push(buildCreneau(semaine_id, USER_ID, jour, regle, numMHM));
      }
    }

    // 9. Insérer tous les créneaux en une seule requête
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

// --- Helpers ---

// Détermine matin ou aprem selon l'heure de début
function heureToPeriode(heureDebut) {
  const h = parseInt(heureDebut.split(':')[0], 10);
  return h < 13 ? 'matin' : 'aprem';
}

// Construit un créneau variable depuis une règle MHM
function buildCreneau(semaine_id, user_id, jour, regle, numMHM) {
  // Horaires par défaut selon le moment déduit du niveau et du type de règle
  // Ces horaires seront affinés quand le template variable sera en base
  const horaire = deduireHoraire(regle);

  return {
    semaine_id,
    user_id,
    jour,
    heure_debut: horaire.debut,
    heure_fin: horaire.fin,
    moment: horaire.moment,
    type: 'variable',
    regle_id: regle.id,
    niveau: regle.niveau,
    periode: heureToPeriode(horaire.debut),
    notes: null,
    lien_programme: regle.sous_domaine_id
  };
}

// Déduit l'horaire d'un créneau selon la règle
// À affiner quand le template variable sera en base
function deduireHoraire(regle) {
  const desc = regle.description.toLowerCase();

  // Rituels → 8h40–9h20
  if (desc.includes('rituel')) {
    return { debut: '08:40', fin: '09:20', moment: 'Rituels maths' };
  }

  // Ateliers → 8h50–9h20 (rotation 1)
  if (desc.includes('atelier') || desc.includes('temps 1') || desc.includes('temps 2')) {
    return { debut: '08:50', fin: '09:20', moment: 'Ateliers' };
  }

  // Autonomie → après-midi
  if (desc.includes('auto') || desc.includes('autonome')) {
    return { debut: '14:00', fin: '14:30', moment: 'Activités autonomes' };
  }

  // Défaut → matin 11h
  return { debut: '11:00', fin: '11:30', moment: 'Divers' };
}
