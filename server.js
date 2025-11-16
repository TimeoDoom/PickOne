import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// Pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Connexion à Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test de connexion à la base de données
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connecté à la base de données Neon");

    // Test query
    const result = await client.query("SELECT NOW()");
    console.log("✅ Test query réussi:", result.rows[0]);

    client.release();
  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données :", err.message);
  }
};

initializeDatabase();

// #############################
// --- ROUTES API ---
// #############################

// Route pour la page principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check (important pour Render)
app.get("/health", async (req, res) => {
  try {
    // Tester la connexion à la base de données
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "OK",
      message: "Serveur et base de données fonctionnent",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Problème avec la base de données",
      error: error.message,
    });
  }
});

// Récupérer tous les paris
app.get("/api/paris", async (req, res) => {
  try {
    console.log("📥 Requête pour récupérer tous les paris");

    const result = await pool.query(`
      SELECT 
        p.*,
        COUNT(CASE WHEN v.choix = p.optionA THEN 1 END) as votesA,
        COUNT(CASE WHEN v.choix = p.optionB THEN 1 END) as votesB
      FROM pari p
      LEFT JOIN vote v ON p.idBet = v.betId
      GROUP BY p.idBet
      ORDER BY p.creationDate DESC
    `);

    console.log(`✅ ${result.rows.length} paris récupérés`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erreur /api/paris:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des paris",
      details: err.message,
    });
  }
});

// Route de connexion admin
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Vérifier si l'admin existe
    const query = `
      SELECT idUser, userPassword 
      FROM users 
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      console.log("❌ Admin introuvable");
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const admin = result.rows[0];

    // 2. Comparer mot de passe avec hash
    const isValid = await bcrypt.compare(password, admin.userpassword);

    if (!isValid) {
      console.log("❌ Mot de passe admin incorrect");
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // 3. OK
    console.log("✅ Connexion admin réussie");

    res.json({
      message: "Connexion admin réussie",
      adminId: admin.iduser,
    });
  } catch (err) {
    console.error("❌ Erreur connexion admin:", err);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

// Créer un nouveau pari (admin seulement)
app.post("/api/paris", async (req, res) => {
  try {
    const { title, description, deadline, optionA, optionB, creatorId } =
      req.body;

    console.log("📝 Création d'un nouveau pari:", { title, creatorId });

    // Vérifier que seul l'admin peut créer des paris
    if (creatorId !== 1) {
      return res
        .status(403)
        .json({ error: "Seul l'admin peut créer des paris" });
    }

    const result = await pool.query(
      `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        title,
        description,
        deadline,
        optionA || "Oui",
        optionB || "Non",
        creatorId,
      ]
    );

    console.log("✅ Pari créé avec ID:", result.rows[0].idbet);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur création pari:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la création du pari: " + err.message });
  }
});

// Mettre à jour un pari
app.put("/api/paris/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, optionA, optionB } = req.body;

    console.log(`✏️ Mise à jour du pari ${id}`);

    const result = await pool.query(
      `UPDATE pari SET title = $1, description = $2, deadline = $3, optionA = $4, optionB = $5 
       WHERE idBet = $6 RETURNING *`,
      [title, description, deadline, optionA || "Oui", optionB || "Non", id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    console.log("✅ Pari mis à jour");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur mise à jour pari:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour du pari: " + err.message });
  }
});

// Supprimer un pari
app.delete("/api/paris/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Suppression du pari ${id}`);

    const result = await pool.query(
      `DELETE FROM pari WHERE idBet = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    console.log("✅ Pari supprimé");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur suppression pari:", err);
    res.status(500).json({
      error: "Erreur lors de la suppression d'un pari: " + err.message,
    });
  }
});

// Voter pour un pari
app.post("/api/paris/:id/vote", async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { userId, choix } = req.body;

    console.log(
      `🗳️ Vote pour le pari ${id} par l'utilisateur ${userId}: ${choix}`
    );

    if (!userId) {
      return res.status(400).json({ message: "ID utilisateur requis" });
    }

    if (!choix) {
      return res.status(400).json({ message: "Choix de vote requis" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const pariCheck = await client.query(
      `SELECT optionA, optionB FROM pari WHERE idBet = $1`,
      [id]
    );

    if (pariCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Pari non trouvé" });
    }

    const { optiona, optionb } = pariCheck.rows[0];

    if (choix !== optiona && choix !== optionb) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Choix de vote invalide. Doit être "${optiona}" ou "${optionb}"`,
      });
    }

    const voteCheck = await client.query(
      `SELECT * FROM vote WHERE userId = $1 AND betId = $2`,
      [userId, id]
    );

    if (voteCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Vous avez déjà voté pour ce pari." });
    }

    const insertVote = await client.query(
      `INSERT INTO vote (choix, userId, betId) VALUES ($1, $2, $3) RETURNING *`,
      [choix, userId, id]
    );

    const updatedPari = await client.query(
      `SELECT beta, betb FROM pari WHERE idBet = $1`,
      [id]
    );

    await client.query("COMMIT");

    console.log("✅ Vote enregistré avec succès");
    res.status(201).json({
      message: "Vote enregistré",
      vote: insertVote.rows[0],
      counts: updatedPari.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    console.error("❌ Erreur vote:", err);
    res.status(500).json({
      message: "Erreur serveur lors de l'enregistrement du vote",
      error: err.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Récupérer les votes d'un utilisateur
app.get("/api/user/votes", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID requis" });
    }

    console.log(`📊 Récupération des votes pour l'utilisateur ${userId}`);

    const result = await pool.query(
      `SELECT betId, choix FROM vote WHERE userId = $1`,
      [userId]
    );

    console.log(`✅ ${result.rows.length} votes récupérés`);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erreur récupération votes:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des votes" });
  }
});

// Route catch-all pour SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Démarrer le serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});
