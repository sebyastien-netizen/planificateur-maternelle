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

  const { semaine_id, tout } = req.body;

  // Mode batch — pré-remplit toutes les semaines P1
  if (tout) {
    const SEMAINES_P1 = [
      'a4338c80-ee36-4b56-92a9-4eacca4c096a', // S1
      '1710aaea-db55-4f55-bf75-dbd5258ead88', // S2
      'f7c36cd8-3a6e-4317-962c-5d8edc16a888', // S3
      '9b0b5d89-55e3-41f4-bda4-6a3fd89c0eb4', // S4
      'a8eff5fd-aa1d-4260-bb46-ddbe2c442d91', // S5
      '91832461-1a4a-431f-9b04-0659588567a7', // S6
      '047ff3bd-d389-48ff-8d2c-7e21fb1a14a7'  // S7
    ];

    const resultats = [];
    for (const id of SEMAINES_P1) {
      const host = req.headers.host;
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const r = await fetch(`${protocol}://${host}/api/marie-preremplir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semaine_id: id })
      });
      const data = await r.json();
      if (r.status === 409) {
        resultats.push({ semaine_id: id, statut: 'deja remplie' });
      } else if (!r.ok) {
        resultats.push({ semaine_id: id, statut: 'erreur', detail: data.error });
      } else {
        resultats.push({ semaine_id: id, statut: 'ok', creneaux_inseres: data.creneaux_inseres });
      }
    }
    return res.status(200).json({ resultats });
  }

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
    const numeroSemaineApp   = semaine.numero_semaine;
    const reglesQuotidiennes = regles.filter(r => r.frequence_type === 'quotidien');
    const reglesHebdo        = regles.filter(r => r.frequence_type === 'hebdomadaire');
    const rituelsJ1          = reglesHebdo.filter(r => r.frequence_valeur === 1);

    // Rituels quotidiens :
    // - semaine_mhm null → s'appliquent toutes les semaines
    // - semaine_mhm non null → s'appliquent uniquement à cette semaine
    const rituelsQuotidiens = reglesQuotidiennes.filter(r =>
      r.semaine_mhm === null || r.semaine_mhm === numeroSemaineApp
    );

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
    // Ordre identique pour tous les jours — boucle jours en extérieur
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
    // Mapping semaine app → semaine MHM (offset -1)
    // S1 rentrée = pas de semaine MHM spécifique
    // S2 app = semaine_mhm 2, S3 app = semaine_mhm 3, etc.
    const numeroSemaineApp = semaine.numero_semaine;

    for (const jour of jours) {
      const numJourMHM = JOUR_TO_MHM[jour];

      // Filtrer par jour MHM ET par semaine MHM :
      // - semaine_mhm null = rituel récurrent toutes semaines (ex: mascotte PS)
      // - semaine_mhm === numeroSemaineApp = rituel spécifique à cette semaine
      const reglesDuJour = reglesHebdo.filter(r =>
        r.frequence_valeur === numJourMHM &&
        (r.semaine_mhm === null || r.semaine_mhm === numeroSemaineApp)
      );

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
