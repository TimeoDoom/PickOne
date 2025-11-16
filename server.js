// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import pkg from "pg";
// import bcrypt from "bcrypt";

// dotenv.config();
// const { Pool } = pkg;

// const app = express();
// const port = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static("public"));

// // Connexion à Neon PostgreSQL
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// pool
//   .connect()
//   .then(() => console.log("Connecté à la base de données Neon"))
//   .catch((err) => console.error("Erreur de connexion :", err));

// // #############################
// // --- ROUTES ---
// // #############################

// // Vérification API
// // app.get("/", (req, res) => {
// //   res.send("API PickOne en ligne !");
// // });

// // Récupérer tous les paris
// app.get("/api/paris", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         p.*,
//         COUNT(CASE WHEN v.choix = p.optionA THEN 1 END) as votesA,
//         COUNT(CASE WHEN v.choix = p.optionB THEN 1 END) as votesB
//       FROM pari p
//       LEFT JOIN vote v ON p.idBet = v.betId
//       GROUP BY p.idBet
//       ORDER BY p.creationDate DESC
//     `);
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: "Erreur lors de la récupération des paris" });
//   }
// });

// // Créer un nouveau pari
// // app.post("/api/paris", async (req, res) => {
// //   try {
// //     const { title, description, deadline, optionA, optionB, creatorId } =
// //       req.body;

// //     const result = await pool.query(
// //       `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
// //        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
// //       [
// //         title,
// //         description,
// //         deadline,
// //         optionA || "Oui",
// //         optionB || "Non",
// //         creatorId,
// //       ]
// //     );

// //     res.status(201).json(result.rows[0]);
// //   } catch (err) {
// //     res
// //       .status(500)
// //       .json({ error: "Erreur lors de la création du pari: " + err.message });
// //   }
// // });

// // Ajouter une route pour la connexion admin
// app.post("/api/admin/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     if (!username || !password) {
//       return res
//         .status(400)
//         .json({ message: "Nom d'utilisateur et mot de passe requis" });
//     }

//     // Vérifier les identifiants admin dans la base de données
//     const result = await pool.query(
//       `SELECT idUser, userName, userPassword FROM users WHERE userName = $1 AND idUser = 1`,
//       [username]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({ message: "Identifiants incorrects" });
//     }

//     const admin = result.rows[0];

//     // Ici, vous devriez utiliser bcrypt pour comparer les mots de passe
//     // Pour l'instant, comparaison simple (à remplacer par bcrypt.compare)
//     const isPasswordValid = await bcrypt.compare(password, admin.userpassword);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Identifiants incorrects" });
//     }

//     // Connexion réussie
//     res.json({
//       message: "Connexion admin réussie",
//       adminId: admin.iduser,
//     });
//   } catch (err) {
//     console.error("Erreur connexion admin:", err);
//     res.status(500).json({ message: "Erreur lors de la connexion" });
//   }
// });

// // Protéger les routes admin avec un middleware
// async function requireAdminAuth(req, res, next) {
//   try {
//     const { username, password } = req.body;

//     // Pour les routes PUT/DELETE, on peut vérifier d'une autre manière
//     // Ici on va simplement s'assurer que seul l'admin (idUser = 1) peut modifier/supprimer
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "Accès non autorisé" });
//   }
// }

// // Modifier la route de création pour s'assurer que seul l'admin peut créer
// app.post("/api/paris", async (req, res) => {
//   try {
//     const { title, description, deadline, optionA, optionB, creatorId } =
//       req.body;

//     // Vérifier que seul l'admin peut créer des paris
//     if (creatorId !== 1) {
//       return res
//         .status(403)
//         .json({ error: "Seul l'admin peut créer des paris" });
//     }

//     const result = await pool.query(
//       `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
//        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
//       [
//         title,
//         description,
//         deadline,
//         optionA || "Oui",
//         optionB || "Non",
//         creatorId,
//       ]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ error: "Erreur lors de la création du pari: " + err.message });
//   }
// });

// // Mettre à jour un pari
// app.put("/api/paris/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { title, description, deadline, optionA, optionB } = req.body;

//     const result = await pool.query(
//       `UPDATE pari SET title = $1, description = $2, deadline = $3, optionA = $4, optionB = $5
//        WHERE idBet = $6 RETURNING *`,
//       [title, description, deadline, optionA || "Oui", optionB || "Non", id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Pari non trouvé" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ error: "Erreur lors de la mise à jour du pari: " + err.message });
//   }
// });

// app.delete("/api/paris/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query(
//       `DELETE FROM pari WHERE idBet = $1 RETURNING *`,
//       [id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Pari non trouvé" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ error: "Erreur lors de la suppression d'un pari" + err.message });
//   }
// });
// // Voter pour un pari
// app.post("/api/paris/:id/vote", async (req, res) => {
//   let client;
//   try {
//     const { id } = req.params;
//     const { userId, choix } = req.body;

//     // Validation des données
//     if (!userId) {
//       return res.status(400).json({ message: "ID utilisateur requis" });
//     }

//     if (!choix) {
//       return res.status(400).json({ message: "Choix de vote requis" });
//     }

//     // Utiliser une transaction
//     client = await pool.connect();
//     await client.query("BEGIN");

//     // Vérifier si le pari existe et récupérer ses options
//     const pariCheck = await client.query(
//       `SELECT optionA, optionB FROM pari WHERE idBet = $1`,
//       [id]
//     );

//     if (pariCheck.rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res.status(404).json({ message: "Pari non trouvé" });
//     }

//     const { optiona, optionb } = pariCheck.rows[0];

//     // Vérifier que le choix est valide
//     if (choix !== optiona && choix !== optionb) {
//       await client.query("ROLLBACK");
//       return res.status(400).json({
//         message: `Choix de vote invalide. Doit être "${optiona}" ou "${optionb}"`,
//       });
//     }

//     // Vérifier si l'utilisateur a déjà voté
//     const voteCheck = await client.query(
//       `SELECT * FROM vote WHERE userId = $1 AND betId = $2`,
//       [userId, id]
//     );

//     if (voteCheck.rows.length > 0) {
//       await client.query("ROLLBACK");
//       return res
//         .status(400)
//         .json({ message: "Vous avez déjà voté pour ce pari." });
//     }

//     // Ajouter le vote
//     const insertVote = await client.query(
//       `INSERT INTO vote (choix, userId, betId) VALUES ($1, $2, $3) RETURNING *`,
//       [choix, userId, id]
//     );

//     // Vérifier si le trigger a fonctionné en récupérant les nouveaux compteurs
//     const updatedPari = await client.query(
//       `SELECT betA, betB FROM pari WHERE idBet = $1`,
//       [id]
//     );

//     await client.query("COMMIT");

//     res.status(201).json({
//       message: "Vote enregistré",
//       vote: insertVote.rows[0],
//       counts: updatedPari.rows[0],
//     });
//   } catch (err) {
//     if (client) {
//       await client.query("ROLLBACK");
//       client.release();
//     }
//     res.status(500).json({
//       message: "Erreur serveur lors de l'enregistrement du vote",
//       error: err.message,
//       details: err.detail,
//     });
//   } finally {
//     if (client) {
//       client.release();
//     }
//   }
// });

// // Récupérer les votes d'un utilisateur
// app.get("/api/user/votes", async (req, res) => {
//   try {
//     const { userId } = req.query;

//     if (!userId) {
//       return res.status(400).json({ error: "User ID requis" });
//     }

//     const result = await pool.query(
//       `SELECT betId, choix FROM vote WHERE userId = $1`,
//       [userId]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("Erreur récupération votes:", err);
//     res.status(500).json({ error: "Erreur lors de la récupération des votes" });
//   }
// });

// // Lancer le serveur
// app.listen(port, () => {
//   console.log(`Serveur en ligne sur http://localhost:${port}`);
// });
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 3000;

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
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test de connexion à la base de données
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connecté à la base de données Neon");
    client.release();
  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données :", err);
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
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur /api/paris:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des paris" });
  }
});

// Route de connexion admin
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Nom d'utilisateur et mot de passe requis" });
    }

    // Vérifier les identifiants admin
    const result = await pool.query(
      `SELECT idUser, userName, userPassword FROM users WHERE userName = $1 AND idUser = 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const admin = result.rows[0];

    // TEMPORAIRE - Comparaison simple
    const tempPassword = "admin123";
    if (password !== tempPassword) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    res.json({
      message: "Connexion admin réussie",
      adminId: admin.iduser,
    });
  } catch (err) {
    console.error("Erreur connexion admin:", err);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

// Créer un nouveau pari (admin seulement)
app.post("/api/paris", async (req, res) => {
  try {
    const { title, description, deadline, optionA, optionB, creatorId } =
      req.body;

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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur création pari:", err);
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

    const result = await pool.query(
      `UPDATE pari SET title = $1, description = $2, deadline = $3, optionA = $4, optionB = $5 
       WHERE idBet = $6 RETURNING *`,
      [title, description, deadline, optionA || "Oui", optionB || "Non", id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur mise à jour pari:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour du pari: " + err.message });
  }
});

// Supprimer un pari
app.delete("/api/paris/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM pari WHERE idBet = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pari non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur suppression pari:", err);
    res
      .status(500)
      .json({
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
      `SELECT betA, betB FROM pari WHERE idBet = $1`,
      [id]
    );

    await client.query("COMMIT");

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
    console.error("Erreur vote:", err);
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

    const result = await pool.query(
      `SELECT betId, choix FROM vote WHERE userId = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération votes:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des votes" });
  }
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Route catch-all pour SPA - DOIT ÊTRE LA DERNIÈRE ROUTE
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Export pour Vercel Serverless
export default app;
