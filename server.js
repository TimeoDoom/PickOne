import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import Joi from "joi";
import crypto from "crypto";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// Pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== FONCTIONS DE SÉCURITÉ ====================

function generateSecureSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// ==================== CONFIGURATION DE SÉCURITÉ ====================

// Helmet avec configuration simplifiée
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé temporairement pour debug
  crossOriginEmbedderPolicy: false
}));

// Configuration CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true 
    : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, veuillez réessayer plus tard." }
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives de connexion, veuillez réessayer plus tard." }
});

// Sessions
app.use(session({
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || generateSecureSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

// Middlewares de base
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Désactivation de l'en-tête X-Powered-By
app.disable('x-powered-by');

// ==================== MIDDLEWARES DE SÉCURITÉ PERSONNALISÉS ====================

// Protection headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Sanitization
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
});

// ==================== SCHEMAS DE VALIDATION ====================

const pariSchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  description: Joi.string().trim().max(1000).allow(''),
  deadline: Joi.date().iso().greater('now').required(),
  optionA: Joi.string().trim().max(100).default('Oui'),
  optionB: Joi.string().trim().max(100).default('Non')
});

const voteSchema = Joi.object({
  userId: Joi.string().max(100).required(),
  choix: Joi.string().trim().max(100).required()
});

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required()
});

// ==================== MIDDLEWARES PERSONNALISÉS ====================

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Données invalides", 
        details: error.details[0].message 
      });
    }
    req.validatedData = value;
    next();
  };
};

const requireAdminAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "Authentification admin requise" });
  }
  next();
};

// ==================== CONNEXION BD ====================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connecté à la base de données Neon");
    client.release();
  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données :", err.message);
  }
};

initializeDatabase();

// ==================== ROUTES API ====================

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Route pour la page principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "OK",
      message: "Serveur et base de données fonctionnent",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Problème avec la base de données"
    });
  }
});

// Récupérer tous les paris
app.get("/api/paris", async (req, res) => {
  try {
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
      error: "Erreur lors de la récupération des paris"
    });
  }
});

// Route de connexion admin
app.post("/api/admin/login", authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.validatedData;

    const query = `
      SELECT idUser, userPassword 
      FROM users 
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const admin = result.rows[0];
    const isValid = await bcrypt.compare(password, admin.userpassword);

    if (!isValid) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur d'authentification" });
      }

      req.session.adminId = admin.iduser;
      res.json({
        message: "Connexion admin réussie",
        adminId: admin.iduser,
      });
    });

  } catch (err) {
    console.error("❌ Erreur connexion admin:", err);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

// Déconnexion admin
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    
    res.clearCookie('sessionId');
    res.json({ message: "Déconnexion réussie" });
  });
});

// Vérifier statut authentification
app.get("/api/admin/status", (req, res) => {
  res.json({ isAuthenticated: !!req.session.adminId });
});

// Créer un nouveau pari
app.post("/api/paris", requireAdminAuth, validateRequest(pariSchema), async (req, res) => {
  try {
    const { title, description, deadline, optionA, optionB } = req.validatedData;

    const result = await pool.query(
      `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, deadline, optionA, optionB, req.session.adminId]
    );

    console.log("✅ Pari créé avec ID:", result.rows[0].idbet);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur création pari:", err);
    res.status(500).json({ error: "Erreur lors de la création du pari" });
  }
});

// Mettre à jour un pari
app.put("/api/paris/:id", requireAdminAuth, validateRequest(pariSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, optionA, optionB } = req.validatedData;

    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "ID de pari invalide" });
    }

    const result = await pool.query(
      `UPDATE pari SET title = $1, description = $2, deadline = $3, optionA = $4, optionB = $5 
       WHERE idBet = $6 RETURNING *`,
      [title, description, deadline, optionA, optionB, idNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur mise à jour pari:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du pari" });
  }
});

// Supprimer un pari
app.delete("/api/paris/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "ID de pari invalide" });
    }

    const result = await pool.query(
      `DELETE FROM pari WHERE idBet = $1 RETURNING *`,
      [idNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur suppression pari:", err);
    res.status(500).json({ error: "Erreur lors de la suppression d'un pari" });
  }
});

// Voter pour un pari
app.post("/api/paris/:id/vote", validateRequest(voteSchema), async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { userId, choix } = req.validatedData;

    const pariId = parseInt(id);
    if (isNaN(pariId) || pariId <= 0) {
      return res.status(400).json({ message: "ID de pari invalide" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const pariCheck = await client.query(
      `SELECT optionA, optionB FROM pari WHERE idBet = $1`,
      [pariId]
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
      [userId, pariId]
    );

    if (voteCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Vous avez déjà voté pour ce pari." });
    }

    const insertVote = await client.query(
      `INSERT INTO vote (choix, userId, betId) VALUES ($1, $2, $3) RETURNING *`,
      [choix, userId, pariId]
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: "Vote enregistré",
      vote: insertVote.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("❌ Erreur vote:", err);
    res.status(500).json({
      message: "Erreur serveur lors de l'enregistrement du vote"
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

    const result = await pool.query(
      `SELECT betId, choix FROM vote WHERE userId = $1`,
      [userId]
    );

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

// Gestion d'erreurs simplifiée
app.use((err, req, res, next) => {
  console.error("❌ Erreur:", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

// Démarrer le serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Mode sécurité: ${process.env.NODE_ENV || 'development'}`);
});
