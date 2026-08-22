// api/rituels.js
// GET /api/rituels?periode=1
// Retourne les règles MHM rituels (quotidiens + jour_mhm non null) pour une période

export default async function handler(req, res) {
  const { periode = 1 } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Variables Supabase manquantes' });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/maternelle_regles` +
      `?select=id,niveau,description,frequence_type,frequence_valeur,jour_mhm,est_introduction` +
      `&periode=eq.${periode}` +
      `&or=(frequence_type.eq.quotidien,jour_mhm.not.is.null)` +
      `&order=niveau,jour_mhm,id`;

    const supaRes = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!supaRes.ok) {
      const err = await supaRes.text();
      return res.status(supaRes.status).json({ error: err });
    }

    const regles = await supaRes.json();
    return res.status(200).json({ regles });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
