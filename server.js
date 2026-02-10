import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const { Pool } = pkg;
const app = Fastify({ logger: true });
const PORT = 3000;

// ==========================
// 1. Dossier public
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

// ==========================
// 2. Plugin cookies + JWT
// ==========================
app.register(fastifyCookie);

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

// ==========================
// 3. Middleware d'authentification
// ==========================
app.decorate("authenticate", async function (request, reply) {
  try {
    const token = request.cookies.token;
    if (!token) {
      return reply.status(401).send({ error: "Token manquant" });
    }

    const decoded = app.jwt.verify(token);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: "Token invalide" });
  }
});

// ==========================
// 4. PostgreSQL
// ==========================
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

pool
  .query("SELECT NOW()")
  .then((res) => console.log("Connexion PostgreSQL OK:", res.rows[0]))
  .catch((err) => console.error("Erreur connexion PostgreSQL:", err));

// ==========================
// 5. ROUTES API
// ==========================

// Liste des users
app.get("/api/users", async (request, reply) => {
  try {
    const tableUser = await pool.query("SELECT * FROM users");
    return tableUser.rows;
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: "Erreur recup users" });
  }
});

// Vérif email existe
app.get("/api/users/email/:email", async (request, reply) => {
  const { email } = request.params;

  try {
    const res = await pool.query("SELECT 1 FROM users WHERE email=$1", [email]);
    return { exists: res.rows.length > 0 };
  } catch (err) {
    return reply.status(500).send({ error: "Erreur serveur" });
  }
});

// Vérif pseudo existe
app.get("/api/users/username/:username", async (request, reply) => {
  const { username } = request.params;
  try {
    const res = await pool.query("SELECT 1 FROM users WHERE username=$1", [
      username,
    ]);
    return { exists: res.rows.length > 0 };
  } catch (err) {
    return reply.status(500).send({ error: "Erreur serveur" });
  }
});

// INSCRIPTION
app.post("/api/registerUser", async (req, reply) => {
  const { email, pseudo, mdp } = req.body;

  if (!email || !pseudo || !mdp) {
    return reply.status(400).send({
      success: false,
      error: "Email, pseudo et mot de passe requis",
    });
  }

  const hashed = await bcrypt.hash(mdp, 10);

  const result = await pool.query(
    "INSERT INTO users (email, username, userpassword) VALUES ($1, $2, $3) RETURNING iduser, username, email",
    [email, pseudo, hashed],
  );

  const user = result.rows[0];

  const token = app.jwt.sign(
    { id: user.iduser, email, username: user.username },
    { expiresIn: "1h" },
  );

  reply
    .setCookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 7 * 24 * 3600,
    })
    .send({ success: true, token });
});

// CONNEXION
app.post("/api/login", async (request, reply) => {
  const { email, password } = request.body;

  try {
    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    const res = await pool.query(
      "SELECT iduser, userpassword, username, wallet FROM users WHERE email = $1",
      [email],
    );

    if (res.rows.length === 0) {
      return reply.status(401).send({
        success: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    const user = res.rows[0];

    const valid = await bcrypt.compare(password, user.userpassword);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    const token = app.jwt.sign(
      {
        id: user.iduser,
        email,
        username: user.username,
        wallet: user.wallet,
      },
      { expiresIn: "1h" },
    );

    reply.setCookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });

    return reply.send({ success: true, token });
  } catch (err) {
    console.error("ERREUR LOGIN:", err.message);
    return reply.status(500).send({
      success: false,
      error: "Erreur serveur : " + err.message,
    });
  }
});

// Vérification de connexion
app.get(
  "/api/auth/me",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    return {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      wallet: req.user.wallet,
    };
  },
);

// Recuperation de toutes les données utilisateur
app.get(
  "/api/auth/data",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    try {
      const res = await pool.query(
        `SELECT 
          iduser,
          username,
          email,
          wallet,
          nb_paris_crees,
          nb_paris_gagnes
        FROM users
        WHERE iduser = $1`,
        [req.user.id],
      );

      if (res.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      return reply.send(res.rows[0]);
    } catch (err) {
      console.error("ERREUR GET AUTH/DATA:", err.message);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur : " + err.message,
      });
    }
  },
);

// Mise à jour des données utilisateur
app.post(
  "/api/auth/data/update",
  { preHandler: [app.authenticate] },
  async (req, rep) => {
    const { userName, email } = req.body;
    const userId = req.user.id;

    try {
      if (email) {
        const emailCheck = await pool.query(
          "SELECT iduser FROM users WHERE email = $1 AND iduser != $2",
          [email, userId],
        );

        if (emailCheck.rows.length > 0) {
          return rep.send({
            success: false,
            error: "Cet email est déjà utilisé par un autre compte",
          });
        }
      }

      if (userName) {
        const usernameCheck = await pool.query(
          "SELECT iduser FROM users WHERE username = $1 AND iduser != $2",
          [userName, userId],
        );

        if (usernameCheck.rows.length > 0) {
          return rep.send({
            success: false,
            error: "Ce nom d'utilisateur est déjà pris",
          });
        }
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (email) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      if (userName) {
        updates.push(`username = $${paramCount}`);
        values.push(userName);
        paramCount++;
      }

      if (updates.length === 0) {
        return rep.send({
          success: false,
          error: "Aucune donnée à mettre à jour",
        });
      }

      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(", ")} 
        WHERE iduser = $${paramCount}
        RETURNING iduser, email, username
      `;

      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return rep.send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      return rep.send({
        success: true,
        user: result.rows[0],
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      return rep.status(500).send({
        success: false,
        error: "Erreur serveur lors de la mise à jour",
      });
    }
  },
);

// Changement de mot de passe
app.post(
  "/api/auth/update-password",
  { preHandler: [app.authenticate] },
  async (req, rep) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log(
      "Tentative de changement de mot de passe pour l'utilisateur:",
      userId,
    );

    try {
      const res = await pool.query(
        "SELECT userpassword FROM users WHERE iduser = $1",
        [userId],
      );

      if (res.rows.length === 0) {
        return rep.send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      const valid = await bcrypt.compare(
        currentPassword,
        res.rows[0].userpassword,
      );

      if (!valid) {
        return rep.send({
          success: false,
          error: "Mot de passe actuel incorrect",
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return rep.send({
          success: false,
          error: "Le nouveau mot de passe doit contenir au moins 6 caractères",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query("UPDATE users SET userpassword = $1 WHERE iduser = $2", [
        hashedPassword,
        userId,
      ]);

      console.log(
        "Mot de passe changé avec succès pour l'utilisateur:",
        userId,
      );

      return rep.send({
        success: true,
        message: "Mot de passe changé avec succès",
      });
    } catch (err) {
      console.error("Erreur lors du changement de mot de passe:", err);
      return rep.status(500).send({
        success: false,
        error: "Erreur serveur lors du changement de mot de passe",
      });
    }
  },
);

// ============================
// ENDPOINTS POUR LES PARIS
// ============================

// Créer un nouveau pari
app.post(
  "/api/bets/create",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const {
      title,
      category,
      type,
      deadline,
      startingBet,
      choices,
      tags,
      visibility,
      maxParticipants,
      creatorId,
    } = request.body;

    if (
      !title ||
      !category ||
      !type ||
      !deadline ||
      !startingBet ||
      !choices ||
      choices.length < 2
    ) {
      return reply.status(400).send({
        success: false,
        error: "Données manquantes ou invalides",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const categoryResult = await client.query(
        "SELECT idcategory FROM categories WHERE name = $1",
        [category.toUpperCase()],
      );

      if (categoryResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.status(400).send({
          success: false,
          error: "Catégorie invalide",
        });
      }

      const categoryId = categoryResult.rows[0].idcategory;

      const walletResult = await client.query(
        "SELECT wallet FROM users WHERE iduser = $1",
        [creatorId],
      );

      if (walletResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.status(404).send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      const wallet = parseFloat(walletResult.rows[0].wallet);

      // Permettre de parier même avec un solde de 0
      // if (wallet < startingBet) {
      //   await client.query("ROLLBACK");
      //   return reply.status(400).send({
      //     success: false,
      //     error: "Solde insuffisant",
      //   });
      // }

      const betResult = await client.query(
        `INSERT INTO pari (
          title, 
          deadline, 
          creatorid, 
          category_id, 
          bet_type, 
          starting_bet,
          visibility,
          max_participants,
          tags,
          optionA,
          optionB
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING idbet`,
        [
          title,
          deadline,
          creatorId,
          categoryId,
          type,
          startingBet,
          visibility,
          maxParticipants,
          tags.length > 0 ? tags : null,
          choices[0],
          choices[1],
        ],
      );

      const betId = betResult.rows[0].idbet;

      if (choices.length > 2) {
        for (let i = 2; i < choices.length; i++) {
          await client.query(
            "INSERT INTO bet_options (bet_id, option_text) VALUES ($1, $2)",
            [betId, choices[i]],
          );
        }
      }

      await client.query(
        "UPDATE users SET wallet = wallet - $1 WHERE iduser = $2",
        [startingBet, creatorId],
      );

      await client.query(
        `INSERT INTO wallet_transactions (
          user_id, 
          amount, 
          transaction_type, 
          description, 
          bet_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          creatorId,
          startingBet,
          "bet_creation",
          `Création du pari: ${title}`,
          betId,
        ],
      );

      await client.query(
        "UPDATE users SET nb_paris_crees = nb_paris_crees + 1 WHERE iduser = $1",
        [creatorId],
      );

      await client.query("COMMIT");

      return reply.send({
        success: true,
        betId: betId,
        message: "Pari créé avec succès",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erreur création pari:", err);
      return reply.status(500).send({
        success: false,
        error: "Erreur lors de la création du pari",
      });
    } finally {
      client.release();
    }
  },
);

// Route pour voter
// Route pour voter (version simplifiée - sans pickcoins)
app.post(
  "/api/bets/vote",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const { betId, choice } = request.body; // REMOVE: betAmount parameter
    const userId = request.user.id;

    console.log("🎲 Tentative de vote simple:", { betId, choice, userId });

    // Validation simplifiée
    if (!betId || !choice) {
      return reply.status(400).send({
        success: false,
        error: "Données manquantes (betId et choice requis)",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Vérifier si le pari existe
      const betCheck = await client.query(
        "SELECT * FROM pari WHERE idbet = $1",
        [betId],
      );

      if (betCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.status(404).send({
          success: false,
          error: "Pari non trouvé",
        });
      }

      const bet = betCheck.rows[0];

      // 2. Vérifier si le pari est actif
      if (bet.status !== "active") {
        await client.query("ROLLBACK");
        return reply.status(400).send({
          success: false,
          error: "Ce pari n'est plus actif",
        });
      }

      // 3. Vérifier si la date n'est pas passée
      if (new Date(bet.deadline) < new Date()) {
        await client.query("ROLLBACK");
        return reply.status(400).send({
          success: false,
          error: "Le pari est terminé",
        });
      }

      // 4. Vérifier si l'utilisateur n'a pas déjà voté
      const existingVote = await client.query(
        "SELECT * FROM vote WHERE userid = $1 AND betid = $2",
        [userId, betId],
      );

      if (existingVote.rows.length > 0) {
        await client.query("ROLLBACK");
        return reply.status(400).send({
          success: false,
          error: "Vous avez déjà voté sur ce pari",
        });
      }

      // 5. Vérifier que le choix est valide
      const validChoices = [bet.optiona, bet.optionb];

      // Vérifier aussi dans bet_options si c'est un pari à choix multiples
      const extraOptions = await client.query(
        "SELECT option_text FROM bet_options WHERE bet_id = $1",
        [betId],
      );

      extraOptions.rows.forEach((row) => {
        validChoices.push(row.option_text);
      });

      if (!validChoices.includes(choice)) {
        await client.query("ROLLBACK");
        return reply.status(400).send({
          success: false,
          error: "Choix invalide",
        });
      }

      // 6. Insérer le vote (sans montant de mise)
      await client.query(
        `INSERT INTO vote (choix, userid, betid, bet_amount, datevote)
         VALUES ($1, $2, $3, $4, NOW())`,
        [choice, userId, betId, 0], // bet_amount = 0 pour un vote simple
      );

      // 7. Mettre à jour les statistiques du pari
      if (choice === bet.optiona) {
        await client.query("UPDATE pari SET beta = beta + 1 WHERE idbet = $1", [
          betId,
        ]);
      } else if (choice === bet.optionb) {
        await client.query("UPDATE pari SET betb = betb + 1 WHERE idbet = $1", [
          betId,
        ]);
      }

      // 8. Mettre à jour le nombre de participants (mais pas le total_bets)
      await client.query(
        `UPDATE pari 
         SET participants = participants + 1 
         WHERE idbet = $1`,
        [betId],
      );

      await client.query("COMMIT");

      return reply.send({
        success: true,
        message: "Vote enregistré avec succès",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      return reply.status(500).send({
        success: false,
        error: "Erreur lors du vote: " + err.message,
      });
    } finally {
      client.release();
    }
  },
);
// app.post(
//   "/api/bets/vote",
//   { preHandler: [app.authenticate] },
//   async (request, reply) => {
//     const { betId, choice, betAmount } = request.body;
//     const userId = request.user.id;

//     console.log("🎲 Tentative de vote:", { betId, choice, betAmount, userId });

//     if (!betId || !choice || !betAmount) {
//       return reply.status(400).send({
//         success: false,
//         error: "Données manquantes",
//       });
//     }

//     if (betAmount <= 0) {
//       return reply.status(400).send({
//         success: false,
//         error: "Le montant doit être positif",
//       });
//     }

//     const client = await pool.connect();

//     try {
//       await client.query("BEGIN");

//       const betCheck = await client.query(
//         "SELECT * FROM pari WHERE idbet = $1",
//         [betId],
//       );

//       if (betCheck.rows.length === 0) {
//         await client.query("ROLLBACK");
//         return reply.status(404).send({
//           success: false,
//           error: "Pari non trouvé",
//         });
//       }

//       const bet = betCheck.rows[0];

//       if (bet.status !== "active") {
//         await client.query("ROLLBACK");
//         return reply.status(400).send({
//           success: false,
//           error: "Ce pari n'est plus actif",
//         });
//       }

//       if (new Date(bet.deadline) < new Date()) {
//         await client.query("ROLLBACK");
//         return reply.status(400).send({
//           success: false,
//           error: "Le pari est terminé",
//         });
//       }

//       const walletCheck = await client.query(
//         "SELECT wallet FROM users WHERE iduser = $1",
//         [userId],
//       );

//       const walletBalance = parseFloat(walletCheck.rows[0].wallet);

//       if (walletBalance < betAmount) {
//         await client.query("ROLLBACK");
//         return reply.status(400).send({
//           success: false,
//           error: `Solde insuffisant. Vous avez ${walletBalance} pickCoins, montant demandé: ${betAmount}`,
//         });
//       }

//       const existingVote = await client.query(
//         "SELECT * FROM vote WHERE userid = $1 AND betid = $2",
//         [userId, betId],
//       );

//       if (existingVote.rows.length > 0) {
//         await client.query("ROLLBACK");
//         return reply.status(400).send({
//           success: false,
//           error: "Vous avez déjà voté sur ce pari",
//         });
//       }

//       const validChoices = [bet.optiona, bet.optionb];

//       const extraOptions = await client.query(
//         "SELECT option_text FROM bet_options WHERE bet_id = $1",
//         [betId],
//       );

//       extraOptions.rows.forEach((row) => {
//         validChoices.push(row.option_text);
//       });

//       if (!validChoices.includes(choice)) {
//         await client.query("ROLLBACK");
//         return reply.status(400).send({
//           success: false,
//           error: "Choix invalide",
//         });
//       }

//       await client.query(
//         `INSERT INTO vote (choix, userid, betid, bet_amount, datevote)
//          VALUES ($1, $2, $3, $4, NOW())`,
//         [choice, userId, betId, betAmount],
//       );

//       await client.query(
//         "UPDATE users SET wallet = wallet - $1 WHERE iduser = $2",
//         [betAmount, userId],
//       );

//       if (choice === bet.optiona) {
//         await client.query("UPDATE pari SET beta = beta + 1 WHERE idbet = $1", [
//           betId,
//         ]);
//       } else if (choice === bet.optionb) {
//         await client.query("UPDATE pari SET betb = betb + 1 WHERE idbet = $1", [
//           betId,
//         ]);
//       }

//       if (extraOptions.rows.some((row) => row.option_text === choice)) {
//         await client.query(
//           `UPDATE bet_options
//            SET voters_count = voters_count + 1,
//                bet_amount = bet_amount + $1
//            WHERE bet_id = $2 AND option_text = $3`,
//           [betAmount, betId, choice],
//         );
//       }

//       await client.query(
//         `UPDATE pari
//          SET total_bets = total_bets + $1,
//              participants = participants + 1
//          WHERE idbet = $2`,
//         [betAmount, betId],
//       );

//       await client.query(
//         `INSERT INTO wallet_transactions
//          (user_id, amount, transaction_type, description, bet_id, created_at)
//          VALUES ($1, $2, $3, $4, $5, NOW())`,
//         [userId, betAmount, "bet", `Pari sur: ${bet.title} (${choice})`, betId],
//       );

//       await client.query("COMMIT");

//       console.log("✅ Vote enregistré avec succès");

//       return reply.send({
//         success: true,
//         message: "Vote enregistré avec succès",
//         data: {
//           betAmount: betAmount,
//           newBalance: (walletBalance - betAmount).toFixed(2),
//         },
//       });
//     } catch (err) {
//       await client.query("ROLLBACK");
//       console.error("❌ Erreur vote:", err);
//       return reply.status(500).send({
//         success: false,
//         error: "Erreur lors du vote: " + err.message,
//       });
//     } finally {
//       client.release();
//     }
//   },
// );

// Récupérer un pari spécifique (CORRIGÉ - bonne route)
app.get("/api/bets/:id", async (request, reply) => {
  const { id } = request.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        p.*,
        u.username as creator_name,
        c.name as category_name,
        COUNT(DISTINCT v.idvote) as total_votes,
        COALESCE(SUM(CASE WHEN v.choix = p.optionA THEN 1 ELSE 0 END), 0) as votes_a,
        COALESCE(SUM(CASE WHEN v.choix = p.optionB THEN 1 ELSE 0 END), 0) as votes_b,
        COALESCE(SUM(v.bet_amount), 0) as total_amount
      FROM pari p
      LEFT JOIN users u ON p.creatorid = u.iduser
      LEFT JOIN categories c ON p.category_id = c.idcategory
      LEFT JOIN vote v ON p.idbet = v.betid
      WHERE p.idbet = $1
      GROUP BY p.idbet, u.username, c.name
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "Pari non trouvé",
      });
    }

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error("Erreur récupération pari:", err);
    return reply.status(500).send({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Récupérer les détails complets d'un pari (NOUVELLE ROUTE)
app.get("/api/bets/:id/full", async (request, reply) => {
  const { id } = request.params;

  try {
    const betResult = await pool.query(
      `SELECT p.*, u.username, c.name as category_name 
       FROM pari p
       JOIN users u ON p.creatorid = u.iduser
       JOIN categories c ON p.category_id = c.idcategory
       WHERE p.idbet = $1`,
      [id],
    );

    if (betResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "Pari non trouvé",
      });
    }

    const bet = betResult.rows[0];

    const optionsResult = await pool.query(
      `SELECT * FROM bet_options WHERE bet_id = $1`,
      [id],
    );

    const votesResult = await pool.query(
      `SELECT v.*, u.username 
       FROM vote v
       JOIN users u ON v.userid = u.iduser
       WHERE v.betid = $1
       ORDER BY v.datevote DESC
       LIMIT 10`,
      [id],
    );

    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT v.idvote) as total_votes,
        SUM(v.bet_amount) as total_amount,
        COALESCE(SUM(CASE WHEN v.choix = p.optionA THEN 1 ELSE 0 END), 0) as votes_a,
        COALESCE(SUM(CASE WHEN v.choix = p.optionB THEN 1 ELSE 0 END), 0) as votes_b
      FROM pari p
      LEFT JOIN vote v ON p.idbet = v.betid
      WHERE p.idbet = $1
      GROUP BY p.idbet
    `,
      [id],
    );

    return reply.send({
      success: true,
      bet: bet,
      options: optionsResult.rows,
      recentVotes: votesResult.rows,
      stats: statsResult.rows[0] || {},
    });
  } catch (err) {
    console.error("Erreur récupération détails pari:", err);
    return reply.status(500).send({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Récupérer les votes d'un utilisateur
app.get(
  "/api/bets/my-votes",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          v.*,
          p.title as bet_title,
          p.deadline,
          p.status as bet_status,
          p.winner_option
        FROM vote v
        JOIN pari p ON v.betid = p.idbet
        WHERE v.userid = $1
        ORDER BY v.datevote DESC
      `,
        [request.user.id],
      );

      return reply.send(result.rows);
    } catch (err) {
      console.error("Erreur récupération votes:", err);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur",
      });
    }
  },
);

// Récupérer les paris d'un utilisateur
app.get(
  "/api/bets/my-bets",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    try {
      const result = await pool.query(
        `
        SELECT 
          p.*,
          c.name as category_name,
          COUNT(DISTINCT v.idvote) as total_votes
        FROM pari p
        LEFT JOIN categories c ON p.category_id = c.idcategory
        LEFT JOIN vote v ON p.idbet = v.betid
        WHERE p.creatorid = $1
        GROUP BY p.idbet, c.name
        ORDER BY p.creationdate DESC
        `,
        [request.user.id],
      );

      return reply.send(result.rows);
    } catch (err) {
      console.error("Erreur récupération paris utilisateur:", err);
      return reply.status(500).send({
        success: false,
        error: "Erreur lors de la récupération de vos paris",
      });
    }
  },
);

// Récupérer TOUS les paris
app.get("/api/allBets", async (request, reply) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.username as creator_name,
        c.name as category_name,
        COUNT(DISTINCT v.idvote) as total_votes,
        COALESCE(SUM(CASE WHEN v.choix = p.optionA THEN 1 ELSE 0 END), 0) as votes_a,
        COALESCE(SUM(CASE WHEN v.choix = p.optionB THEN 1 ELSE 0 END), 0) as votes_b,
        COALESCE(SUM(v.bet_amount), 0) as total_amount
      FROM pari p
      LEFT JOIN users u ON p.creatorid = u.iduser
      LEFT JOIN categories c ON p.category_id = c.idcategory
      LEFT JOIN vote v ON p.idbet = v.betid
      WHERE p.status = 'active'
      GROUP BY p.idbet, u.username, c.name
      ORDER BY p.creationdate DESC
    `);

    return result.rows;
  } catch (err) {
    console.error("Erreur récupération paris:", err);
    return reply
      .status(500)
      .send({ error: "Erreur lors de la récupération des paris" });
  }
});

// Récupérer les paris par catégorie
app.get("/api/bets/category/:category", async (request, reply) => {
  const { category } = request.params;

  try {
    const result = await pool.query(
      `
      SELECT p.*, u.username 
      FROM pari p
      JOIN users u ON p.creatorid = u.iduser
      JOIN categories c ON p.category_id = c.idcategory
      WHERE c.name = $1 AND p.status = 'active'
      ORDER BY p.creationdate DESC
    `,
      [category.toUpperCase()],
    );

    return reply.send(result.rows);
  } catch (err) {
    console.error("Erreur récupération paris par catégorie:", err);
    return reply.status(500).send({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Rechercher des paris
app.get("/api/bets/search", async (request, reply) => {
  const { q } = request.query;

  try {
    const result = await pool.query(
      `
      SELECT * FROM pari 
      WHERE title ILIKE $1 OR details ILIKE $1
      AND status = 'active'
      ORDER BY creationdate DESC
    `,
      [`%${q}%`],
    );

    return reply.send(result.rows);
  } catch (err) {
    console.error("Erreur recherche paris:", err);
    return reply.status(500).send({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Déconnexion
app.post("/api/logout", async (req, reply) => {
  reply.clearCookie("token", { path: "/" });
  return { success: true };
});

// ==========================
// 6. Lancer le serveur
// ==========================
const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Fastify running at http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
