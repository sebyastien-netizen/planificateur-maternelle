// api/semaine.js
// Retourne une semaine avec ses créneaux enrichis des descriptions de règles
// GET /api/semaine?id=UUID_SEMAINE

export default async function handler(req, res) {
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
    if (!resSemaine.ok) throw new Error(`Erreur Supabase semaine : ${resSemaine.status}`);
    const semaines = await resSemaine.json();
    if (!semaines.length) return res.status(404).json({ error: 'Semaine introuvable' });
    const semaine = semaines[0];

    // 2. Récupérer les créneaux
    const resCreneaux = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_creneaux?semaine_id=eq.${id}&select=id,jour,heure_debut,heure_fin,moment,groupe,niveau,role,notes,lien_programme,activite,regle_id,periode,type,titre_fixe&order=heure_debut.asc`,
      { headers }
    );
    if (!resCreneaux.ok) throw new Error(`Erreur Supabase créneaux : ${resCreneaux.status}`);
    const creneaux = await resCreneaux.json();

    // 3. Récupérer la période
    const resPeriode = await fetch(
      `${SUPABASE_URL}/rest/v1/maternelle_periodes?id=eq.${semaine.periode_id}&select=numero,date_debut,date_fin`,
      { headers }
    );
    const periodes = await resPeriode.json();
    const periode = periodes[0] || null;

    // 4. Enrichir les créneaux avec les descriptions de règles
    // Collecter les regle_id uniques
    const regleIds = [...new Set(
      creneaux
        .filter(c => c.regle_id)
        .map(c => c.regle_id)
    )];

    let reglesMap = {};

    if (regleIds.length > 0) {
      // Récupérer toutes les règles en une seule requête
      const idsParam = `(${regleIds.map(id => `"${id}"`).join(',')})`;
      const resRegles = await fetch(
        `${SUPABASE_URL}/rest/v1/maternelle_regles?id=in.${idsParam}&select=id,description,niveau,domaine_id,sous_domaine_id`,
        { headers }
      );
      if (resRegles.ok) {
        const regles = await resRegles.json();
        reglesMap = Object.fromEntries(regles.map(r => [r.id, r]));
      }
    }

    // 5. Enrichir chaque créneau
    const creneauxEnrichis = creneaux.map(c => {
      if (c.regle_id && reglesMap[c.regle_id]) {
        const regle = reglesMap[c.regle_id];
        return {
          ...c,
          // Extraire le titre court depuis la description (avant le premier ':')
          activite: extraireTitre(regle.description),
          description_complete: regle.description,
          niveau: c.niveau || regle.niveau,
          lien_programme: c.lien_programme || regle.sous_domaine_id
        };
      }
      return c;
    });

    // 6. Retourner
    return res.status(200).json({
      semaine: { ...semaine, periode },
      creneaux: creneauxEnrichis
    });

  } catch (err) {
    console.error('api/semaine.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Extrait un titre court depuis la description MHM
// "S1 Temps 1 — Le matériel de maths (A1) : associer..." → "Le matériel de maths"
// "Rituel étiquette-prénom + appel numérique : chaque jour..." → "Étiquette-prénom + appel numérique"
function extraireTitre(description) {
  if (!description) return '—';

  // Chercher le pattern "— Titre (ref) :" ou "Sx — Titre :"
  const matchTitre = description.match(/—\s*([^(:]+?)(?:\s*\([^)]*\))?\s*:/);
  if (matchTitre) {
    return matchTitre[1].trim();
  }

  // Sinon prendre ce qui est avant le premier ':'
  const avantDeuxPoints = description.split(':')[0].trim();

  // Nettoyer les préfixes de semaine "S1 Temps 1 —", "S1 auto —", etc.
  const nettoye = avantDeuxPoints
    .replace(/^S\d+\s*(Temps\s*\d+\s*)?—\s*/i, '')
    .replace(/^S\d+\s*auto\s*—\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();

  // Tronquer si trop long
  return nettoye.length > 60 ? nettoye.substring(0, 57) + '…' : nettoye;
}
