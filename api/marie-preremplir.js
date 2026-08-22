// api/marie-preremplir.js
// Marie pré-remplit une semaine depuis maternelle_regles
// POST /api/marie-preremplir
// Body : { semaine_id: UUID }

// Mapping fixe : jour de classe → numéro de jour MHM
const JOUR_TO_MHM = {
  mardi:    2,
  jeudi:    3,
  vendredi: 4
};

// Moments en pleine largeur — insérés une seule fois sans jour
const MOMENTS_PLEINS = ['Accueil', 'Récréation', 'Sieste PS', 'Réveil PS'];

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

  function makeCreneau(overrides) {
    return {
      semaine_id,
      user_id:        USER_ID,
      jour:           null,
      heure_debut:    null,
      heure_fin:      null,
      moment:         null,
      type:           'variable',
      titre_fixe:     null,
      niveau:         null,
      periode:        null,
      activite:       null,
      regle_id:       null,
      notes:          null,
      lien_programme: null,
      role:           null,
      groupe:         null,
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

    // 3. Jours actifs
    const jours = [];
    if (semaine.a_mardi) jours.push('mardi');
    jours.push('jeudi');
    jours.push('vendredi');

    // 4. Récupérer toutes les règles MHM pour cette période
    const resRegles = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_regles?periode=eq.${numPeriode}&select=id,niveau,frequence_type,frequence_valeur,description,domaine_id,sous_domaine_id`,
      { headers }
    );
    const regles = await resRegles.json();

    // 5. Vérifier absence de créneaux existants
    const resExistants = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?semaine_id=eq.${semaine_id}&select=id`,
      { headers }
    );
    const existants = await resExistants.json();
    if (existants.length > 0) {
      return res.status(409).json({ error: 'Des créneaux existent déjà pour cette semaine.' });
    }

    // 6. Récupérer le template fixe
    const resTemplate = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux_template?user_id=eq.${USER_ID}&type=eq.fixe&select=*`,
      { headers }
    );
    const template = await resTemplate.json();

    // 7. Séparer les règles
    const reglesQuotidiennes = regles.filter(r => r.frequence_type === 'quotidien');
    const reglesHebdo        = regles.filter(r => r.frequence_type === 'hebdomadaire');
    const rituelsJ1          = reglesHebdo.filter(r => r.frequence_valeur === 1);

    // Rituels quotidiens → moment "Rituels" (CHAQUE JOUR, pleine largeur)
    const rituelsQuotidiens = reglesQuotidiennes;

    // Rituels du jour → moment "Rituels maths PS" ou "Rituels maths GS" selon niveau
    // PS : 08h40–08h50 · GS : 09h20–09h30

    // 8. Générer les créneaux
    const creneauxAInserer = [];

    // --- CRÉNEAUX FIXES ---
    for (const tmpl of template) {
      const estPlein = MOMENTS_PLEINS.some(m => tmpl.moment.includes(m));
      if (estPlein) {
        creneauxAInserer.push(makeCreneau({
          jour:        null,
          heure_debut: tmpl.heure_debut,
          heure_fin:   tmpl.heure_fin,
          moment:      tmpl.moment,
          type:        'fixe',
          titre_fixe:  tmpl.moment,
          niveau:      tmpl.niveau || null,
          periode:     heureToPeriode(tmpl.heure_debut)
        }));
      } else {
        for (const jour of jours) {
          creneauxAInserer.push(makeCreneau({
            jour,
            heure_debut: tmpl.heure_debut,
            heure_fin:   tmpl.heure_fin,
            moment:      tmpl.moment,
            type:        'fixe',
            titre_fixe:  tmpl.moment,
            niveau:      tmpl.niveau || null,
            periode:     heureToPeriode(tmpl.heure_debut)
          }));
        }
      }
    }

    // --- RITUELS QUOTIDIENS → moment "Rituels", par colonne jour par jour ---
    // Ordre fixe : PS+GS d'abord, puis GS, puis PS — étiquette d'appel toujours en tête
    const ORDRE_RITUELS = ['PS+GS', 'GS', 'PS'];
    const rituelsQuotidiensTries = [...rituelsQuotidiens].sort((a, b) => {
      const ia = ORDRE_RITUELS.indexOf(a.niveau);
      const ib = ORDRE_RITUELS.indexOf(b.niveau);
      if (ia !== ib) return ia - ib;
      return a.id.localeCompare(b.id);
    });
    for (const jour of jours) {
      for (const regle of rituelsQuotidiensTries) {
        creneauxAInserer.push(makeCreneau({
          jour,
          heure_debut:    '08:35',
          heure_fin:      '08:40',
          moment:         'Rituels',
          niveau:         regle.niveau,
          periode:        'matin',
          regle_id:       regle.id,
          lien_programme: regle.sous_domaine_id
        }));
      }
    }

    // --- RITUELS DU JOUR → par colonne selon J2/J3/J4 ---
    for (const jour of jours) {
      const numJourMHM = JOUR_TO_MHM[jour];
      const reglesDuJour = reglesHebdo.filter(r => r.frequence_valeur === numJourMHM);

      for (const regle of reglesDuJour) {
        // PS : 08h40–08h50 · GS : 09h20–09h30
        const estPS = regle.niveau === 'PS';
        creneauxAInserer.push(makeCreneau({
          jour,
          heure_debut:    estPS ? '08:40' : '09:20',
          heure_fin:      estPS ? '08:50' : '09:30',
          moment:         estPS ? 'Rituels maths PS' : 'Rituels maths GS',
          niveau:         regle.niveau,
          periode:        'matin',
          regle_id:       regle.id,
          lien_programme: regle.sous_domaine_id
        }));
      }
    }

    // --- ATELIERS → À remplir par jour (Marie ne pré-place pas encore) ---
    // Les règles d'apprentissage et d'autonomie seront placées dans une prochaine itération
    // Pour l'instant on crée les cases vides dans le template

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
      jours_actifs:     jours,
      creneaux_inseres: creneauxAInserer.length,
      rituels_j1:       rituelsJ1.map(r => ({
        id:          r.id,
        niveau:      r.niveau,
        description: r.description
      }))
    });

  } catch (err) {
    console.error('api/marie-preremplir.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function heureToPeriode(heureDebut) {
  if (!heureDebut) return 'matin';
  const h = parseInt(heureDebut.split(':')[0], 10);
  return h < 13 ? 'matin' : 'aprem';
}
