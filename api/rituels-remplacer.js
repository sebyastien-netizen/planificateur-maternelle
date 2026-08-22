// api/rituels-remplacer.js
// POST /api/rituels-remplacer
// Body : { creneau_id, regle_id }
// Remplace le regle_id d'un créneau existant

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const { creneau_id, regle_id } = req.body;

  if (!creneau_id || !regle_id) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?id=eq.${creneau_id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ regle_id })
      }
    );

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
