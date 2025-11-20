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

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// Pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIGURATION DE SÉCURITÉ RENFORCÉE ====================

// Helmet avec CSP renforcé
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Configuration CORS sécurisée
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://votre-domaine.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting général
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: { error: "Trop de requêtes, veuillez réessayer plus tard." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Rate limiting strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives de connexion, veuillez réessayer plus tard." },
  skipSuccessfulRequests: true
});

// Rate limiting pour la création de paris (prévention spam)
const createBetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // maximum 10 paris par heure
  message: { error: "Trop de paris créés, veuillez réessayer plus tard." }
});

// Sessions sécurisées
app.use(session({
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || this.generateSecureSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24h
    sameSite: 'strict',
    domain: process.env.NODE_ENV === 'production' ? 'votre-domaine.com' : undefined
  },
  store: new session.MemoryStore() // En production, utilisez Redis ou PostgreSQL
}));

// Génération de secret sécurisé
function generateSecureSecret() {
  return require('crypto').randomBytes(64).toString('hex');
}

// Protection contre les attaques par pollution de prototypes
app.use((req, res, next) => {
  Object.setPrototypeOf(req, Object.prototype);
  Object.setPrototypeOf(res, Object.prototype);
  next();
});

// Limite de taille des requêtes
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Désactivation de l'en-tête X-Powered-By
app.disable('x-powered-by');

// ==================== MIDDLEWARES DE SÉCURITÉ PERSONNALISÉS ====================

// Protection contre les attaques XSS
const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};
app.use(xssProtection);

// Protection contre le sniffing MIME
const noSniff = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};
app.use(noSniff);

// Frame protection
const frameGuard = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};
app.use(frameGuard);

// Logging des accès admin
const adminAccessLogger = (req, res, next) => {
  if (req.session.adminId) {
    console.log('🔐 Accès admin:', {
      adminId: req.session.adminId,
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Sanitization avancée
const advancedSanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '') // Supprime < et >
      .replace(/javascript:/gi, '') // Supprime javascript:
      .replace(/on\w+=/gi, ''); // Supprime les handlers d'événements
  }
  return input;
};

// Middleware de sanitization global
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = advancedSanitizeInput(req.body[key]);
      }
    });
  }
  next();
});

// Validation des paramètres d'URL
const validateParams = (req, res, next) => {
  const id = req.params.id;
  if (id && !/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Paramètre ID invalide" });
  }
  next();
};

// ==================== SCHEMAS DE VALIDATION RENFORCÉS ====================

const pariSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required()
    .pattern(/^[a-zA-Z0-9À-ÿ\s\-_.,!?()]+$/)
    .messages({
      'string.pattern.base': 'Le titre contient des caractères non autorisés'
    }),
  description: Joi.string().trim().max(1000).allow('')
    .pattern(/^[a-zA-Z0-9À-ÿ\s\-_.,!?()]*$/),
  deadline: Joi.date().iso().greater('now').required()
    .custom((value, helpers) => {
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1); // 1 an maximum
      if (value > maxDate) {
        return helpers.error('date.max');
      }
      return value;
    }, 'Date validation')
    .messages({
      'date.max': 'La date ne peut pas dépasser 1 an dans le futur'
    }),
  optionA: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9À-ÿ\s\-_]+$/).default('Oui'),
  optionB: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9À-ÿ\s\-_]+$/).default('Non'),
  creatorId: Joi.number().integer().positive().forbidden() // Ne pas permettre de définir creatorId manuellement
});

const voteSchema = Joi.object({
  userId: Joi.string().max(100).required().pattern(/^[a-f0-9-]{36}$/),
  choix: Joi.string().trim().max(100).required()
});

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required()
    .pattern(/^[a-zA-Z0-9_]+$/),
  password: Joi.string().min(8).max(100).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
});

// ==================== MIDDLEWARES PERSONNALISÉS RENFORCÉS ====================

// Validation des données avec logging
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log('❌ Validation échouée:', error.details);
      return res.status(400).json({ 
        error: "Données invalides", 
        details: error.details.map(detail => detail.message) 
      });
    }
    req.validatedData = value;
    next();
  };
};

// Authentification admin renforcée
const requireAdminAuth = (req, res, next) => {
  if (!req.session.adminId || typeof req.session.adminId !== 'number') {
    console.log('❌ Tentative d\'accès non autorisée à une route admin:', {
      ip: req.ip,
      url: req.url,
      hasSession: !!req.session.adminId,
      sessionType: typeof req.session.adminId
    });
    return res.status(401).json({ error: "Authentification admin requise" });
  }
  
  // Vérification supplémentaire de la session
  if (!req.sessionID || req.session.cookie.expires < new Date()) {
    console.log('❌ Session expirée ou invalide');
    return res.status(401).json({ error: "Session expirée" });
  }
  
  next();
};

// Vérification de propriété pour les modifications
const checkBetOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.session.adminId;

    const result = await pool.query(
      'SELECT creatorId FROM pari WHERE idBet = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    if (result.rows[0].creatorid !== adminId) {
      console.log('❌ Tentative de modification non autorisée:', {
        adminId,
        creatorId: result.rows[0].creatorid,
        pariId: id
      });
      return res.status(403).json({ error: "Non autorisé à modifier ce pari" });
    }

    next();
  } catch (error) {
    console.error('❌ Erreur vérification propriété:', error);
    res.status(500).json({ error: "Erreur de vérification" });
  }
};

// ==================== CONNEXION BD SÉCURISÉE ====================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de connexion à la base de données avec gestion d'erreur
const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("✅ Connecté à la base de données Neon");

    // Test query avec timeout
    const result = await Promise.race([
      client.query("SELECT NOW()"),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout DB')), 5000)
      )
    ]);

    console.log("✅ Test query réussi:", result.rows[0]);

    // Vérification de la table admin
    const adminCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!adminCheck.rows[0].exists) {
      console.warn("⚠️ Table users non trouvée");
    }

  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données :", err.message);
    
    // Tentative de reconnexion
    setTimeout(initializeDatabase, 5000);
  } finally {
    if (client) client.release();
  }
};

initializeDatabase();

// Gestionnaire d'erreurs pour la pool
pool.on('error', (err) => {
  console.error('❌ Erreur inattendue sur la pool de connexions:', err);
});

// ==================== ROUTES API SÉCURISÉES ====================

// Servir les fichiers statiques (après les middlewares de sécurité)
app.use(express.static(path.join(__dirname, "public"), {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res, path) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Route pour la page principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check sécurisé
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 as status, NOW() as timestamp");
    res.status(200).json({
      status: "OK",
      message: "Serveur et base de données fonctionnent",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Problème avec la base de données"
    });
  }
});

// Récupérer tous les paris (avec filtrage des données sensibles)
app.get("/api/paris", async (req, res) => {
  try {
    console.log("📥 Requête pour récupérer tous les paris depuis IP:", req.ip);

    const result = await pool.query(`
      SELECT 
        p.idBet,
        p.title,
        p.description,
        p.deadline,
        p.optionA,
        p.optionB,
        p.creationDate,
        COUNT(CASE WHEN v.choix = p.optionA THEN 1 END) as votesA,
        COUNT(CASE WHEN v.choix = p.optionB THEN 1 END) as votesB
      FROM pari p
      LEFT JOIN vote v ON p.idBet = v.betId
      GROUP BY p.idBet
      ORDER BY p.creationDate DESC
    `);

    console.log(`✅ ${result.rows.length} paris récupérés`);
    
    // Filtrage des données sensibles
    const safeParis = result.rows.map(pari => ({
      idbet: pari.idbet,
      title: pari.title,
      description: pari.description,
      deadline: pari.deadline,
      optiona: pari.optiona,
      optionb: pari.optionb,
      creationdate: pari.creationdate,
      votesa: parseInt(pari.votesa) || 0,
      votesb: parseInt(pari.votesb) || 0
    }));

    res.json(safeParis);
  } catch (err) {
    console.error("❌ Erreur /api/paris:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des paris"
    });
  }
});

// Route de connexion admin avec sécurité renforcée
app.post("/api/admin/login", authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.validatedData;

    console.log('🔐 Tentative de connexion admin:', { username, ip: req.ip });

    // Délai artificiel pour éviter le timing attack
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    const query = `
      SELECT idUser, userPassword 
      FROM users 
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      console.log("❌ Tentative de connexion avec utilisateur inexistant:", username);
      // Message générique pour éviter l'enumération d'utilisateurs
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const admin = result.rows[0];

    // Vérification du mot de passe avec bcrypt
    const isValid = await bcrypt.compare(password, admin.userpassword);

    if (!isValid) {
      console.log("❌ Mot de passe incorrect pour l'admin:", username);
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // Régénération de session pour prévenir les fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error("❌ Erreur régénération session:", err);
        return res.status(500).json({ message: "Erreur d'authentification" });
      }

      // Création de session sécurisée
      req.session.adminId = admin.iduser;
      req.session.loginTime = new Date();

      console.log("✅ Connexion admin réussie:", { 
        adminId: admin.iduser, 
        username,
        ip: req.ip 
      });

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

// Déconnexion admin sécurisée
app.post("/api/admin/logout", requireAdminAuth, (req, res) => {
  const adminId = req.session.adminId;
  
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Erreur déconnexion:", err);
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    
    res.clearCookie('sessionId');
    console.log("✅ Déconnexion admin réussie:", { adminId });
    res.json({ message: "Déconnexion réussie" });
  });
});

// Vérifier statut authentification
app.get("/api/admin/status", (req, res) => {
  res.json({ 
    isAuthenticated: !!req.session.adminId,
    adminId: req.session.adminId || null
  });
});

// Créer un nouveau pari (admin seulement)
app.post("/api/paris", requireAdminAuth, adminAccessLogger, createBetLimiter, validateRequest(pariSchema), async (req, res) => {
  try {
    const { title, description, deadline, optionA, optionB } = req.validatedData;

    console.log("📝 Création d'un nouveau pari par admin:", { 
      adminId: req.session.adminId,
      title,
      deadline 
    });

    const result = await pool.query(
      `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        title,
        description,
        deadline,
        optionA,
        optionB,
        req.session.adminId
      ]
    );

    console.log("✅ Pari créé avec ID:", result.rows[0].idbet);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur création pari:", err);
    res.status(500).json({ error: "Erreur lors de la création du pari" });
  }
});

// Mettre à jour un pari
app.put("/api/paris/:id", requireAdminAuth, adminAccessLogger, validateParams, checkBetOwnership, validateRequest(pariSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, optionA, optionB } = req.validatedData;

    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "ID de pari invalide" });
    }

    console.log(`✏️ Mise à jour du pari ${id} par admin ${req.session.adminId}`);

    const result = await pool.query(
      `UPDATE pari SET title = $1, description = $2, deadline = $3, optionA = $4, optionB = $5 
       WHERE idBet = $6 RETURNING *`,
      [title, description, deadline, optionA, optionB, idNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    console.log("✅ Pari mis à jour");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Erreur mise à jour pari:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour du pari" });
  }
});

// Supprimer un pari
app.delete("/api/paris/:id", requireAdminAuth, adminAccessLogger, validateParams, checkBetOwnership, async (req, res) => {
  try {
    const { id } = req.params;

    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "ID de pari invalide" });
    }

    console.log(`🗑️ Suppression du pari ${id} par admin ${req.session.adminId}`);

    // Commencer une transaction pour supprimer votes + pari
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Supprimer d'abord les votes associés
      await client.query('DELETE FROM vote WHERE betId = $1', [idNum]);

      // Puis supprimer le pari
      const result = await client.query(
        `DELETE FROM pari WHERE idBet = $1 RETURNING *`,
        [idNum]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Pari non trouvé" });
      }

      await client.query('COMMIT');
      console.log("✅ Pari et votes associés supprimés");
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Erreur suppression pari:", err);
    res.status(500).json({ error: "Erreur lors de la suppression d'un pari" });
  }
});

// Voter pour un pari
app.post("/api/paris/:id/vote", validateParams, validateRequest(voteSchema), async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { userId, choix } = req.validatedData;

    const pariId = parseInt(id);
    if (isNaN(pariId) || pariId <= 0) {
      return res.status(400).json({ message: "ID de pari invalide" });
    }

    // Validation renforcée de l'userId
    if (!/^[a-f0-9-]{36}$/.test(userId)) {
      console.log('❌ UserId invalide:', userId);
      return res.status(400).json({ message: "ID utilisateur invalide" });
    }

    console.log(`🗳️ Vote pour le pari ${pariId} par l'utilisateur ${userId}: ${choix}`);

    client = await pool.connect();
    await client.query("BEGIN");

    // Vérifier que le pari existe et n'est pas expiré
    const pariCheck = await client.query(
      `SELECT optionA, optionB, deadline FROM pari WHERE idBet = $1`,
      [pariId]
    );

    if (pariCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Pari non trouvé" });
    }

    const { optiona, optionb, deadline } = pariCheck.rows[0];

    // Vérifier si le pari est expiré
    if (new Date(deadline) <= new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Ce pari est expiré" });
    }

    if (choix !== optiona && choix !== optionb) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Choix de vote invalide. Doit être "${optiona}" ou "${optionb}"`,
      });
    }

    // Vérifier si l'utilisateur a déjà voté
    const voteCheck = await client.query(
      `SELECT * FROM vote WHERE userId = $1 AND betId = $2`,
      [userId, pariId]
    );

    if (voteCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Vous avez déjà voté pour ce pari." });
    }

    // Enregistrer le vote
    const insertVote = await client.query(
      `INSERT INTO vote (choix, userId, betId) VALUES ($1, $2, $3) RETURNING *`,
      [choix, userId, pariId]
    );

    await client.query("COMMIT");

    console.log("✅ Vote enregistré avec succès");
    res.status(201).json({
      message: "Vote enregistré",
      vote: {
        id: insertVote.rows[0].id,
        choix: insertVote.rows[0].choix,
        betId: insertVote.rows[0].betid
      }
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

    if (!userId || !/^[a-f0-9-]{36}$/.test(userId)) {
      return res.status(400).json({ error: "User ID requis et invalide" });
    }

    console.log(`📊 Récupération des votes pour l'utilisateur ${userId}`);

    const result = await pool.query(
      `SELECT betId, choix FROM vote WHERE userId = $1`,
      [userId]
    );

    console.log(`✅ ${result.rows.length} votes récupérés`);
    
    // Renvoyer seulement les données nécessaires
    const safeVotes = result.rows.map(vote => ({
      betid: vote.betid,
      choix: vote.choix
    }));
    
    res.json(safeVotes);
  } catch (err) {
    console.error("❌ Erreur récupération votes:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des votes" });
  }
});

// ==================== GESTION D'ERREURS GLOBALE ====================

// Middleware pour routes non trouvées
app.use((req, res) => {
  console.log('❌ Route non trouvée:', req.method, req.url);
  res.status(404).json({ error: "Route non trouvée" });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error("❌ Erreur non gérée:", err);
  
  // Ne pas exposer les détails d'erreur en production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
  
  if (err instanceof Joi.ValidationError) {
    return res.status(400).json({ 
      error: "Données invalides",
      details: err.details 
    });
  }
  
  res.status(500).json({ 
    error: "Erreur interne du serveur",
    message: err.message 
  });
});

// Gestion des erreurs non catchées
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non catchée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejet non géré:', reason);
  process.exit(1);
});

// Démarrer le serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Mode sécurité: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Rate limiting: Activé`);
  console.log(`🛡️ Helmet CSP: Activé`);
});
