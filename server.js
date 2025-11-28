import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { request } from "http";
import bcrypt from "bcryptjs";
dotenv.config();

const { Pool } = pkg;
const app = Fastify({ logger: true });
const PORT = 3000;

// ==========================
// 1 Dossier public
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

// ==========================
// 2 PostgreSQL
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
// 3 Routes API
// ==========================

app.get("/api/users", async (request) => {
  try {
    const tableUser = await pool.query("SELECT * FROM users");
    return tableUser.rows;
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: "Erreur recup users " });
  }
});

app.post("/api/registerUser", async (request, reply) => {
  const { email, pseudo, mdp } = request.body;

  try {
    if (!email || !pseudo || !mdp) {
      return reply.status(400).send({ error: "Données manquantes" });
    }

    const hashedPwd = bcrypt.hash(mdp, 14);

    await pool.query(
      "INSERT INTO users (email, userName, userPassword) VALUES ($1, $2, $3)",
      [email, pseudo, hashedPwd]
    );

    return reply.send({ success: true });
  } catch (err) {
    // Cas email déjà utilisé
    if (err.code === "23505") {
      return reply.status(409).send({ error: "Email déjà utilisé" });
    }

    // Autres erreurs
    return reply.status(500).send({ error: "Erreur serveur" });
  }
});

app.get("/api/users/email/:email", async (request, reply) => {
  const { email } = request.params;

  const res = await pool.query("SELECT 1 FROM users WHERE email=$1", [email]);

  return {
    exists: res.rows.length > 0,
  };
});

app.get("/api/users/username/:username", async (request, reply) => {
  const { username } = request.params;
  const res = await pool.query("SELECT 1 FROM users WHERE username=$1", [
    username,
  ]);

  return {
    exists: res.rows.length > 0,
  };
});
// ==========================
// 4 Lancer le serveur
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
