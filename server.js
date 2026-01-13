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
// 3. Middleware d’authentification
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

// ✅ INSCRIPTION - Correct
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
    [email, pseudo, hashed]
  );

  const user = result.rows[0];

  const token = app.jwt.sign(
    { id: user.iduser, email, username: user.username },
    { expiresIn: "1h" }
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

// ✅ CONNEXION - Correct
app.post("/api/login", async (request, reply) => {
  const { email, password } = request.body;

  try {
    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    // ✅ Sans alias 'u.' - requête simple
    const res = await pool.query(
      "SELECT iduser, userpassword, username, wallet FROM users WHERE email = $1",
      [email]
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
      { expiresIn: "1h" }
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
    console.error("❌ ERREUR LOGIN:", err.message);
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
  }
);

// Recuperation de toutes les données utilisateur
app.get(
  "/api/auth/data",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    try {
      // ✅ CORRECTION : Vérifier que la requête est correcte
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
        [req.user.id]
      );

      if (res.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      return reply.send(res.rows[0]);
    } catch (err) {
      console.error("❌ ERREUR GET AUTH/DATA:", err.message);
      return reply.status(500).send({
        success: false,
        error: "Erreur serveur : " + err.message,
      });
    }
  }
);
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
          [email, userId]
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
          [userName, userId]
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
  }
);

// Nouvel endpoint pour le changement de mot de passe
app.post(
  "/api/auth/update-password",
  { preHandler: [app.authenticate] },
  async (req, rep) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log(
      "Tentative de changement de mot de passe pour l'utilisateur:",
      userId
    );

    try {
      // Récupérer le mot de passe actuel
      const res = await pool.query(
        "SELECT userpassword FROM users WHERE iduser = $1",
        [userId]
      );

      if (res.rows.length === 0) {
        return rep.send({
          success: false,
          error: "Utilisateur non trouvé",
        });
      }

      // Vérifier le mot de passe actuel
      const valid = await bcrypt.compare(
        currentPassword,
        res.rows[0].userpassword
      );

      if (!valid) {
        return rep.send({
          success: false,
          error: "Mot de passe actuel incorrect",
        });
      }

      // Validation du nouveau mot de passe
      if (!newPassword || newPassword.length < 6) {
        return rep.send({
          success: false,
          error: "Le nouveau mot de passe doit contenir au moins 6 caractères",
        });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await pool.query("UPDATE users SET userpassword = $1 WHERE iduser = $2", [
        hashedPassword,
        userId,
      ]);

      console.log(
        "Mot de passe changé avec succès pour l'utilisateur:",
        userId
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
  }
);

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
