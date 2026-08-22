// api/rituels-supprimer.js
// POST /api/rituels-supprimer
// Body : { creneau_id }
// Supprime un créneau rituel

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const { creneau_id } = req.body;

  if (!creneau_id) {
    return res.status(400).json({ error: 'creneau_id manquant' });
  }

  try {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?id=eq.${creneau_id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (!supaRes.ok) {
      const err = await supaRes.text();
      return res.status(supaRes.status).json({ error: err });
    }

    return res.status(200).json({ supprime: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
