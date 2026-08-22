// api/semaine.js
// Retourne une semaine avec ses créneaux
// GET /api/semaine?id=UUID_SEMAINE

export default async function handler(req, res) {
  // Seulement GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Paramètre id manquant' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Récupérer la semaine
    const resSemaine = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_semaines?id=eq.${id}&select=id,date_lundi,a_mardi,numero_semaine,periode_id`,
      { headers }
    );

    if (!resSemaine.ok) {
      throw new Error(`Erreur Supabase semaine : ${resSemaine.status}`);
    }

    const semaines = await resSemaine.json();

    if (!semaines.length) {
      return res.status(404).json({ error: 'Semaine introuvable' });
    }

    const semaine = semaines[0];

    // 2. Récupérer les créneaux de cette semaine
    const resCreneaux = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?semaine_id=eq.${id}&select=id,jour,heure_debut,heure_fin,moment,groupe,niveau,role,notes,lien_programme,activite,regle_id,periode,type,titre_fixe&order=heure_debut.asc`,
      { headers }
    );

    if (!resCreneaux.ok) {
      throw new Error(`Erreur Supabase créneaux : ${resCreneaux.status}`);
    }

    const creneaux = await resCreneaux.json();

    // 3. Récupérer la période pour affichage
    const resPeriode = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_periodes?id=eq.${semaine.periode_id}&select=numero,date_debut,date_fin`,
      { headers }
    );

    const periodes = await resPeriode.json();
    const periode = periodes[0] || null;

    // 4. Retourner le tout
    return res.status(200).json({
      semaine: {
        ...semaine,
        periode
      },
      creneaux
    });

  } catch (err) {
    console.error('api/semaine.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
