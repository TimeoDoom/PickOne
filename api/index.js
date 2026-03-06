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

// ==========================
// Configuration Fastify pour Vercel
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;

async function buildApp() {
  if (app) return app;

  app = Fastify({ logger: false });

  // Servir les fichiers statiques
  app.register(fastifyStatic, {
    root: path.join(__dirname, "../public"),
    prefix: "/",
  });

  // Cookies + JWT
  app.register(fastifyCookie);

  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: "token",
      signed: false,
    },
  });

  // Middleware d'authentification
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

  // PostgreSQL (Neon)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
    host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
    database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
    password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
    port: process.env.DATABASE_URL ? undefined : process.env.PGPORT,
    ssl: { rejectUnauthorized: false },
  });

  pool
    .query("SELECT NOW()")
    .then((res) => console.log("Connexion Neon OK:", res.rows[0]))
    .catch((err) => console.error("Erreur connexion Neon:", err));

  // ==========================
  // ROUTES API
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
      const res = await pool.query("SELECT 1 FROM users WHERE email=$1", [
        email,
      ]);
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
        secure: process.env.NODE_ENV === "production",
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
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

        let updateQuery = "UPDATE users SET ";
        const updateValues = [];
        const conditions = [];

        if (userName) {
          updateValues.push(userName);
          conditions.push(`username = $${updateValues.length}`);
        }

        if (email) {
          updateValues.push(email);
          conditions.push(`email = $${updateValues.length}`);
        }

        updateValues.push(userId);
        updateQuery +=
          conditions.join(", ") +
          ` WHERE iduser = $${updateValues.length} RETURNING username, email`;

        const result = await pool.query(updateQuery, updateValues);

        const newToken = app.jwt.sign(
          {
            id: userId,
            email: result.rows[0].email,
            username: result.rows[0].username,
          },
          { expiresIn: "1h" },
        );

        rep.setCookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600,
        });

        return rep.send({
          success: true,
          user: result.rows[0],
        });
      } catch (err) {
        console.error("ERREUR UPDATE USER DATA:", err.message);
        return rep.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Mise à jour du mot de passe
  app.post(
    "/api/auth/data/updatePassword",
    { preHandler: [app.authenticate] },
    async (req, rep) => {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      try {
        if (!oldPassword || !newPassword) {
          return rep.status(400).send({
            success: false,
            error: "Ancien et nouveau mot de passe requis",
          });
        }

        const userResult = await pool.query(
          "SELECT userpassword FROM users WHERE iduser = $1",
          [userId],
        );

        if (userResult.rows.length === 0) {
          return rep.status(404).send({
            success: false,
            error: "Utilisateur non trouvé",
          });
        }

        const isValidOldPassword = await bcrypt.compare(
          oldPassword,
          userResult.rows[0].userpassword,
        );

        if (!isValidOldPassword) {
          return rep.status(401).send({
            success: false,
            error: "Ancien mot de passe incorrect",
          });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
          "UPDATE users SET userpassword = $1 WHERE iduser = $2",
          [hashedNewPassword, userId],
        );

        return rep.send({
          success: true,
          message: "Mot de passe mis à jour avec succès",
        });
      } catch (err) {
        console.error("ERREUR UPDATE PASSWORD:", err.message);
        return rep.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Suppression du compte
  app.delete(
    "/api/auth/deleteAccount",
    { preHandler: [app.authenticate] },
    async (req, rep) => {
      const userId = req.user.id;

      try {
        await pool.query("DELETE FROM users WHERE iduser = $1", [userId]);

        rep.clearCookie("token", { path: "/" });

        return rep.send({
          success: true,
          message: "Compte supprimé avec succès",
        });
      } catch (err) {
        console.error("ERREUR DELETE ACCOUNT:", err.message);
        return rep.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Créer un nouveau pari
  app.post(
    "/api/createBet",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { title, option1, option2, details, enddate, minbet, betamount } =
        req.body;
      const userId = req.user.id;

      if (!title || !option1 || !option2 || !enddate || !minbet || !betamount) {
        return reply.status(400).send({
          success: false,
          error: "Tous les champs sont requis",
        });
      }

      try {
        const userRes = await pool.query(
          "SELECT wallet FROM users WHERE iduser = $1",
          [userId],
        );

        if (userRes.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Utilisateur non trouvé",
          });
        }

        const userWallet = parseFloat(userRes.rows[0].wallet);
        const betAmountNum = parseFloat(betamount);

        if (userWallet < betAmountNum) {
          return reply.status(400).send({
            success: false,
            error: "Solde insuffisant",
          });
        }

        const result = await pool.query(
          `INSERT INTO pari (title, option1, option2, details, enddate, status, iduser, progress, minbet)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, 0, $7)
         RETURNING idbet`,
          [title, option1, option2, details, enddate, userId, minbet],
        );

        const betId = result.rows[0].idbet;

        await pool.query(
          `INSERT INTO bettor (iduser, idbet, betamount, betoption)
         VALUES ($1, $2, $3, $4)`,
          [userId, betId, betamount, option1],
        );

        await pool.query(
          `UPDATE users 
         SET wallet = wallet - $1, nb_paris_crees = nb_paris_crees + 1
         WHERE iduser = $2`,
          [betamount, userId],
        );

        return reply.send({
          success: true,
          message: "Pari créé avec succès",
          betId: betId,
        });
      } catch (err) {
        console.error("ERREUR CREATE BET:", err.message);
        return reply.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Récupérer tous les paris
  app.get("/api/bets", async (req, reply) => {
    try {
      const result = await pool.query(`
        SELECT 
          p.idbet,
          p.title,
          p.option1,
          p.option2,
          p.details,
          p.enddate,
          p.status,
          p.iduser as creator_id,
          u.username as creator_name,
          p.progress,
          p.minbet,
          p.winningoption,
          p.creationdate,
          COALESCE(SUM(b.betamount), 0) as total_amount,
          COUNT(DISTINCT b.iduser) as total_bettors
        FROM pari p
        LEFT JOIN users u ON p.iduser = u.iduser
        LEFT JOIN bettor b ON p.idbet = b.idbet
        GROUP BY p.idbet, u.username
        ORDER BY p.creationdate DESC
      `);

      return reply.send(result.rows);
    } catch (err) {
      console.error("ERREUR GET BETS:", err.message);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur : " + err.message,
      });
    }
  });

  // Récupérer un pari spécifique
  app.get("/api/bets/:id", async (req, reply) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `
        SELECT 
          p.*,
          u.username as creator_name,
          COALESCE(SUM(b.betamount), 0) as total_amount,
          COUNT(DISTINCT b.iduser) as total_bettors,
          COALESCE(SUM(CASE WHEN b.betoption = p.option1 THEN b.betamount ELSE 0 END), 0) as option1_amount,
          COALESCE(SUM(CASE WHEN b.betoption = p.option2 THEN b.betamount ELSE 0 END), 0) as option2_amount
        FROM pari p
        LEFT JOIN users u ON p.iduser = u.iduser
        LEFT JOIN bettor b ON p.idbet = b.idbet
        WHERE p.idbet = $1
        GROUP BY p.idbet, u.username
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
      console.error("ERREUR GET BET:", err.message);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur : " + err.message,
      });
    }
  });

  // Récupérer les parieurs d'un pari
  app.get("/api/bets/:id/bettors", async (req, reply) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `
        SELECT 
          b.iduser,
          u.username,
          b.betamount,
          b.betoption,
          b.betdate
        FROM bettor b
        JOIN users u ON b.iduser = u.iduser
        WHERE b.idbet = $1
        ORDER BY b.betdate DESC
      `,
        [id],
      );

      return reply.send(result.rows);
    } catch (err) {
      console.error("ERREUR GET BETTORS:", err.message);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur : " + err.message,
      });
    }
  });

  // Rejoindre un pari
  app.post(
    "/api/bets/:id/join",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params;
      const { option, amount } = req.body;
      const userId = req.user.id;

      try {
        const betRes = await pool.query("SELECT * FROM pari WHERE idbet = $1", [
          id,
        ]);

        if (betRes.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Pari non trouvé",
          });
        }

        const bet = betRes.rows[0];

        if (bet.status !== "active") {
          return reply.status(400).send({
            success: false,
            error: "Ce pari n'est plus actif",
          });
        }

        const userRes = await pool.query(
          "SELECT wallet FROM users WHERE iduser = $1",
          [userId],
        );

        if (userRes.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Utilisateur non trouvé",
          });
        }

        const userWallet = parseFloat(userRes.rows[0].wallet);
        const betAmount = parseFloat(amount);

        if (userWallet < betAmount) {
          return reply.status(400).send({
            success: false,
            error: "Solde insuffisant",
          });
        }

        if (betAmount < parseFloat(bet.minbet)) {
          return reply.status(400).send({
            success: false,
            error: `Le montant minimum pour ce pari est de ${bet.minbet}€`,
          });
        }

        const existingBet = await pool.query(
          "SELECT * FROM bettor WHERE iduser = $1 AND idbet = $2",
          [userId, id],
        );

        if (existingBet.rows.length > 0) {
          return reply.status(400).send({
            success: false,
            error: "Vous avez déjà parié sur ce pari",
          });
        }

        await pool.query(
          `INSERT INTO bettor (iduser, idbet, betamount, betoption)
           VALUES ($1, $2, $3, $4)`,
          [userId, id, amount, option],
        );

        await pool.query(
          `UPDATE users SET wallet = wallet - $1 WHERE iduser = $2`,
          [amount, userId],
        );

        return reply.send({
          success: true,
          message: "Pari rejoint avec succès",
        });
      } catch (err) {
        console.error("ERREUR JOIN BET:", err.message);
        return reply.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Valider un pari (seulement le créateur)
  app.post(
    "/api/bets/:id/validate",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params;
      const { winningOption } = req.body;
      const userId = req.user.id;

      try {
        const betRes = await pool.query("SELECT * FROM pari WHERE idbet = $1", [
          id,
        ]);

        if (betRes.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Pari non trouvé",
          });
        }

        const bet = betRes.rows[0];

        if (bet.iduser !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Seul le créateur peut valider ce pari",
          });
        }

        if (bet.status !== "active") {
          return reply.status(400).send({
            success: false,
            error: "Ce pari n'est plus actif",
          });
        }

        const bettorsRes = await pool.query(
          `SELECT 
            b.iduser,
            b.betamount,
            b.betoption,
            total.total_pool
          FROM bettor b
          CROSS JOIN (
            SELECT COALESCE(SUM(betamount), 0) as total_pool
            FROM bettor
            WHERE idbet = $1
          ) total
          WHERE b.idbet = $1`,
          [id],
        );

        const totalPool = parseFloat(bettorsRes.rows[0]?.total_pool || 0);

        const winners = bettorsRes.rows.filter(
          (b) => b.betoption === winningOption,
        );
        const totalWinnersBets = winners.reduce(
          (sum, w) => sum + parseFloat(w.betamount),
          0,
        );

        for (const winner of winners) {
          const winnerBet = parseFloat(winner.betamount);
          const winnerShare = (winnerBet / totalWinnersBets) * totalPool;

          await pool.query(
            `UPDATE users 
             SET wallet = wallet + $1,
                 nb_paris_gagnes = nb_paris_gagnes + 1
             WHERE iduser = $2`,
            [winnerShare, winner.iduser],
          );
        }

        await pool.query(
          `UPDATE pari 
           SET status = 'finished', winningoption = $1
           WHERE idbet = $2`,
          [winningOption, id],
        );

        return reply.send({
          success: true,
          message: "Pari validé avec succès",
          winners: winners.length,
        });
      } catch (err) {
        console.error("ERREUR VALIDATE BET:", err.message);
        return reply.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Annuler un pari (seulement le créateur)
  app.post(
    "/api/bets/:id/cancel",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params;
      const userId = req.user.id;

      try {
        const betRes = await pool.query("SELECT * FROM pari WHERE idbet = $1", [
          id,
        ]);

        if (betRes.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "Pari non trouvé",
          });
        }

        const bet = betRes.rows[0];

        if (bet.iduser !== userId) {
          return reply.status(403).send({
            success: false,
            error: "Seul le créateur peut annuler ce pari",
          });
        }

        if (bet.status !== "active") {
          return reply.status(400).send({
            success: false,
            error: "Ce pari n'est plus actif",
          });
        }

        const bettorsRes = await pool.query(
          "SELECT iduser, betamount FROM bettor WHERE idbet = $1",
          [id],
        );

        for (const bettor of bettorsRes.rows) {
          await pool.query(
            `UPDATE users SET wallet = wallet + $1 WHERE iduser = $2`,
            [bettor.betamount, bettor.iduser],
          );
        }

        await pool.query(
          `UPDATE pari SET status = 'cancelled' WHERE idbet = $1`,
          [id],
        );

        await pool.query(
          `UPDATE users 
           SET nb_paris_crees = nb_paris_crees - 1
           WHERE iduser = $1 AND nb_paris_crees > 0`,
          [userId],
        );

        return reply.send({
          success: true,
          message: "Pari annulé avec succès",
        });
      } catch (err) {
        console.error("ERREUR CANCEL BET:", err.message);
        return reply.status(500).send({
          success: false,
          error: "Erreur serveur : " + err.message,
        });
      }
    },
  );

  // Recherche de paris
  app.get("/api/search", async (req, reply) => {
    const { q } = req.query;

    if (!q) {
      return reply.status(400).send({
        success: false,
        error: "Paramètre de recherche manquant",
      });
    }

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

  await app.ready();
  return app;
}

// Export pour Vercel
export default async function handler(req, res) {
  try {
    const fastify = await buildApp();
    fastify.server.emit("request", req, res);
  } catch (error) {
    console.error("Fastify handler error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
    );
  }
}
