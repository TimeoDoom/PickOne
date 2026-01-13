// hashPassword.js
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function hashPassword() {
  rl.question(' Entrez le nouveau mot de passe admin: ', async (password) => {
    // Validation du mot de passe
    if (password.length < 8) {
      console.error(' Le mot de passe doit faire au moins 8 caractères');
      rl.close();
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      console.error('Le mot de passe doit contenir:\n- Une minuscule\n- Une majuscule\n- Un chiffre\n- Un caractère spécial (@$!%*?&)');
      rl.close();
      return;
    }

    try {
      // Générer le hash avec bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      console.log('\n Mot de passe hashé avec succès!');
      console.log('Copiez cette commande SQL dans votre base de données Neon:\n');
      
      console.log(`UPDATE users SET userPassword = '${hashedPassword}' WHERE username = 'votre_nom_admin';`);
      console.log('\n Remplacez "votre_nom_admin" par votre vrai nom d\'utilisateur admin');
      
    } catch (error) {
      console.error('Erreur lors du hash:', error);
    } finally {
      rl.close();
    }
  });
}

hashPassword();