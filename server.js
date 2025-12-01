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
    const res = await pool.query("SELECT 1 FROM users WHERE userName=$1", [
      username,
    ]);
    return { exists: res.rows.length > 0 };
  } catch (err) {
    return reply.status(500).send({ error: "Erreur serveur" });
  }
});

// Inscription
app.post("/api/registerUser", async (req, reply) => {
  const { email, pseudo, mdp } = req.body;

  // hash du mdp
  const hashed = await bcrypt.hash(mdp, 10);

  // insert
  const result = await pool.query(
    "INSERT INTO users (email, username, userpassword) VALUES ($1, $2, $3) RETURNING iduser, username, email",
    [email, pseudo, hashed]
  );

  const user = result.rows[0];

  // création du token (utilise app.jwt fourni par fastify-jwt)
  const token = app.jwt.sign(
    { id: user.iduser, email: user.email || email, username: user.username },
    { expiresIn: "7d" }
  );

  // cookie de session + renvoyer le token en JSON pour compatibilité client
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

// Connexion
app.post("/api/login", async (request, reply) => {
  const { email, password } = request.body;

  try {
    const res = await pool.query(
      "SELECT iduser, userpassword, username, COALESCE(coins, 0) as coins FROM users WHERE email=$1",
      [email]
    );

    if (res.rows.length === 0) {
      return reply
        .status(401)
        .send({ success: false, error: "Email ou mot de passe incorrect" });
    }

    const user = res.rows[0];

    const valid = await bcrypt.compare(password, user.userpassword);
    if (!valid) {
      return reply
        .status(401)
        .send({ success: false, error: "Email ou mot de passe incorrect" });
    }

    const token = app.jwt.sign(
      { id: user.iduser, email, username: user.username, coins: user.coins },
      { expiresIn: "1h" }
    );

    // Cookie sécurisé
    reply.setCookie("token", token, {
      httpOnly: true,
      secure: false, // mettre true en prod (https)
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });

    // Renvoyer le token aussi en JSON pour permettre aux clients JS de le stocker
    return reply.send({ success: true, token });
  } catch (err) {
    return reply.status(500).send({ success: false, error: "Erreur serveur" });
  }
});

// Vérification de connexion
app.get(
  "/api/auth/me",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    return { id: req.user.id, email: req.user.email, name: req.user.username };
  }
);

// Recuperation de toutes les données utilisateur
app.get(
  "/api/auth/data",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    try {
      const res = await pool.query(
        `SELECT 
            u.idUser,
            u.userName,
            u.email,
            u.userPassword,

            COUNT(DISTINCT p.idBet) AS nb_paris_crees,

            COUNT(DISTINCT CASE 
                WHEN p2.isClosed = TRUE 
                AND v.choix = CASE 
                    WHEN p2.winningOption = 'A' THEN p2.optionA
                    WHEN p2.winningOption = 'B' THEN p2.optionB
                END
                THEN p2.idBet
            END) AS nb_paris_gagnes

        FROM users u
        LEFT JOIN pari p ON p.creatorId = u.idUser
        LEFT JOIN vote v ON v.userId = u.idUser
        LEFT JOIN pari p2 ON p2.idBet = v.betId

        WHERE u.idUser = $1

        GROUP BY u.idUser, u.userName, u.email, u.userPassword;
        `,
        [req.user.id]
      );

      return reply.send(res.rows[0] || {});
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Erreur serveur" });
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
