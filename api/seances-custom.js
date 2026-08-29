// api/seances-custom.js
// Gestion des séances custom (hors méthode) dans maternelle_regles
// POST   /api/seances-custom  → INSERT une séance custom
// DELETE /api/seances-custom  → DELETE une séance custom (id en body)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  // ── POST — créer une séance custom ────────────────────────────────────
  if (req.method === 'POST') {
    const { id, description, niveau, type_dispositif, periode, materiel_a_preparer } = req.body;

    if (!id || !description) {
      return res.status(400).json({ error: 'id et description obligatoires' });
    }

    const regle = {
      id,
      source: 'Mes séances',
      description,
      niveau: niveau || null,
      type_dispositif: type_dispositif || null,
      exclu_marie: true,
      periode: periode || 1,
      materiel_a_preparer: materiel_a_preparer || null,
      ordre_sequence: 1,
      frequence_type: 'ponctuel'
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/maternelle_regles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(regle)
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    return res.status(200).json({ ok: true, id });
  }

  // ── DELETE — supprimer une séance custom ──────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id obligatoire' });

    // Vérifier que c'est bien une séance custom (source = 'Mes séances')
    const checkR = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_regles?id=eq.${id}&source=eq.Mes séances&select=id`,
      { headers }
    );
    const check = await checkR.json();
    if (!check.length) return res.status(404).json({ error: 'Séance custom introuvable' });

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_regles?id=eq.${id}`,
      { method: 'DELETE', headers }
    );

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
};
