// api/rituels-ajouter.js
// POST /api/rituels-ajouter
// Body : { semaine_id, jour, moment, niveau, regle_id, heure_debut, heure_fin }
// Ajoute un créneau rituel pour la semaine courante

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const USER_ID = '6c1b1768-457b-4777-b1d9-a309f2fe2cef';

  const { semaine_id, jour, moment, niveau, regle_id, heure_debut, heure_fin } = req.body;

  if (!semaine_id || !jour || !moment || !regle_id) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/maternelle_creneaux`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: USER_ID,
        semaine_id,
        jour,
        moment,
        niveau: niveau || 'PS+GS',
        type: 'variable',
        regle_id,
        heure_debut: heure_debut || '08:35:00',
        heure_fin: heure_fin || '08:40:00'
      })
    });

    if (!supaRes.ok) {
      const err = await supaRes.text();
      return res.status(supaRes.status).json({ error: err });
    }

    const data = await supaRes.json();
    return res.status(200).json({ creneau: data[0] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
