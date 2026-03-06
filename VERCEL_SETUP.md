# Configuration Vercel pour Pick-One

## Structure mise en place

Votre application a été configurée pour fonctionner avec Vercel en mode serverless.

### Changements effectués :

1. **Nouveau fichier `/api/index.js`** : Handler serverless compatible avec Vercel
2. **Mise à jour de `vercel.json`** : Configuration des routes et builds
3. **`.env.example`** : Template des variables d'environnement requises

## Configuration des variables d'environnement sur Vercel

### Méthode 1 : Interface Vercel Dashboard

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Sélectionnez votre projet **pick-one-fuga**
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez les variables suivantes :

#### Variables requises :

- **JWT_SECRET**
  - Valeur : Une chaîne aléatoire sécurisée (min 32 caractères)
  - Exemple : `supertres longue-chaine-aleatoire-securisee-1234567890`
- **DATABASE_URL**
  - Valeur : Votre URL de connexion PostgreSQL Neon
  - Format : `postgresql://username:password@host.region.aws.neon.tech:5432/database?sslmode=require`
  - Trouvez cette URL dans votre dashboard Neon sous "Connection String"

- **NODE_ENV**
  - Valeur : `production`

### Méthode 2 : Ligne de commande Vercel CLI

```bash
# Installez Vercel CLI si ce n'est pas fait
npm i -g vercel

# Ajoutez les variables d'environnement
vercel env add JWT_SECRET
# Entrez votre secret JWT quand demandé

vercel env add DATABASE_URL
# Entrez votre URL de base de données Neon

vercel env add NODE_ENV
# Entrez: production
```

## Déploiement

### Option 1 : Depuis le terminal

```bash
# Si vous avez modifié les fichiers, commitez-les
git add .
git commit -m "Configuration Vercel serverless"
git push

# Vercel redéploiera automatiquement si vous avez activé le déploiement automatique
```

### Option 2 : Déploiement manuel avec Vercel CLI

```bash
vercel --prod
```

## Vérification après déploiement

1. Attendez que le déploiement soit terminé
2. Testez les endpoints :
   - `https://votre-app.vercel.app/` → Page d'accueil
   - `https://votre-app.vercel.app/api/auth/me` → Devrait retourner 401 (normal si non connecté)
   - `https://votre-app.vercel.app/api/bets` → Devrait retourner la liste des paris

3. Testez la création de compte et la connexion

## Problèmes courants et solutions

### Erreur 500 lors de l'appel API

- Vérifiez que DATABASE_URL est correctement configurée
- Vérifiez que JWT_SECRET est défini
- Consultez les logs : `vercel logs` ou dans le dashboard Vercel

### Erreur "Token manquant" même après connexion

- Les cookies doivent avoir `sameSite: "none"` et `secure: true` en production
- C'est déjà configuré dans le nouveau code

### L'API ne répond pas

- Vérifiez dans Settings → Functions que la région est correcte
- Assurez-vous que votre base de données Neon est accessible depuis Internet

## Base de données Neon

Assurez-vous que :

1. Votre projet Neon est actif
2. L'URL de connexion est à jour
3. Les tables sont créées (users, pari, bettor)
4. Les privilèges sont corrects

## Support

Si vous rencontrez toujours des problèmes :

1. Vérifiez les logs Vercel : `vercel logs --follow`
2. Testez la connexion à la base de données localement
3. Vérifiez que toutes les variables d'environnement sont correctement définies

## Test local avant déploiement

Pour tester localement avec le nouveau setup :

```bash
# Créez un fichier .env à la racine
cp .env.example .env

# Éditez .env avec vos vraies valeurs

# Lancez le serveur de dev (server.js original)
npm run dev

# Ou testez avec vercel dev
vercel dev
```
