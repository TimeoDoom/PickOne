// const userNameElem = document.querySelector(".user-name");
// const nbBetElem = document.querySelector(".nb-bet");
// const nbBetWon = document.querySelector(".won-bet");
// const ratioElem = document.querySelector(".ratio");

// const mailInput = document.getElementById("email");
// const userNameInput = document.getElementById("username");

// const cancelBtn = document.querySelector(".cancel");
// const saveBtn = document.querySelector(".save-button");
// const editBtn = document.querySelector(".edit-button");
// const editPwdBtn = document.querySelector(".edit-pwd-button");

// // Éléments du modal mot de passe
// const pwdModal = document.getElementById("pwd-modal");
// const cancelModalBtn = document.querySelector(".cancel-modal");
// const savePasswordBtn = document.querySelector(".save-password");
// const currentPwdInput = document.getElementById("current-password");
// const newPwdInput = document.getElementById("new-password");
// const confirmPwdInput = document.getElementById("confirm-password");

// let currentUser = null;

// // Initialisation : désactiver les champs et cacher les boutons de sauvegarde/annulation
// mailInput.disabled = true;
// userNameInput.disabled = true;
// cancelBtn.style.display = "none";
// saveBtn.style.display = "none";

// async function getCurrentUser() {
//   const res = await fetch("/api/auth/data", { credentials: "include" });
//   if (!res.ok) return null;
//   return await res.json();
// }

// async function updateUserdata(data) {
//   console.log("Envoi des données au serveur:", data);

//   const res = await fetch("/api/auth/data/update", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   });

//   const result = await res.json();
//   console.log("Réponse du serveur:", result);
//   return result;
// }

// async function updatePassword(currentPassword, newPassword) {
//   const res = await fetch("/api/auth/update-password", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ currentPassword, newPassword }),
//   });

//   return await res.json();
// }

// // Bouton "Modifier" - Active le mode édition
// editBtn.addEventListener("click", () => {
//   console.log("Activation du mode édition");

//   mailInput.disabled = false;
//   userNameInput.disabled = false;

//   // Afficher les boutons sauvegarder/annuler
//   saveBtn.style.display = "inline-block";
//   cancelBtn.style.display = "inline-block";

//   // Cacher le bouton modifier
//   editBtn.style.display = "none";

//   // Focus sur le premier champ
//   mailInput.focus();
// });

// // Bouton "Sauvegarder" - Sauvegarde les modifications
// saveBtn.addEventListener("click", async () => {
//   const newMail = mailInput.value.trim();
//   const newUserName = userNameInput.value.trim();

//   console.log("Tentative de sauvegarde:", { newMail, newUserName });

//   // Validation basique
//   if (!newMail || !newUserName) {
//     alert("Tous les champs sont requis");
//     return;
//   }

//   if (newMail === currentUser.email && newUserName === currentUser.username) {
//     alert("Aucune modification détectée");
//     return;
//   }

//   // Afficher un indicateur de chargement
//   saveBtn.textContent = "Sauvegarde...";
//   saveBtn.disabled = true;

//   const result = await updateUserdata({
//     email: newMail,
//     username: newUserName,
//   });

//   if (result.success) {
//     // Mettre à jour l'affichage
//     userNameElem.textContent = newUserName;
//     currentUser.email = newMail;
//     currentUser.username = newUserName;

//     // Désactiver les champs et réinitialiser les boutons
//     mailInput.disabled = true;
//     userNameInput.disabled = true;
//     cancelBtn.style.display = "none";
//     saveBtn.style.display = "none";
//     editBtn.style.display = "inline-block";

//     saveBtn.textContent = "Sauvegarder";
//     saveBtn.disabled = false;

//     alert("Profil mis à jour avec succès !");
//   } else {
//     // Afficher l'erreur
//     alert(result.error || "Erreur lors de la mise à jour");
//     saveBtn.textContent = "Sauvegarder";
//     saveBtn.disabled = false;
//   }
// });

// // Bouton "Annuler" - Annule les modifications
// cancelBtn.addEventListener("click", () => {
//   console.log("Annulation des modifications");

//   // Réinitialiser les valeurs
//   mailInput.value = currentUser.email;
//   userNameInput.value = currentUser.username;

//   // Désactiver les champs
//   mailInput.disabled = true;
//   userNameInput.disabled = true;

//   // Réinitialiser les boutons
//   cancelBtn.style.display = "none";
//   saveBtn.style.display = "none";
//   editBtn.style.display = "inline-block";

//   saveBtn.textContent = "Sauvegarder";
//   saveBtn.disabled = false;
// });

// // Gestion du modal mot de passe
// editPwdBtn.addEventListener("click", () => {
//   // Réinitialiser les champs
//   currentPwdInput.value = "";
//   newPwdInput.value = "";
//   confirmPwdInput.value = "";

//   // Afficher le modal
//   pwdModal.style.display = "block";
// });

// cancelModalBtn.addEventListener("click", () => {
//   pwdModal.style.display = "none";
// });

// savePasswordBtn.addEventListener("click", async () => {
//   const currentPassword = currentPwdInput.value;
//   const newPassword = newPwdInput.value;
//   const confirmPassword = confirmPwdInput.value;

//   // Validation
//   if (!currentPassword || !newPassword || !confirmPassword) {
//     alert("Tous les champs sont requis");
//     return;
//   }

//   if (newPassword.length < 6) {
//     alert("Le mot de passe doit contenir au moins 6 caractères");
//     return;
//   }

//   if (newPassword !== confirmPassword) {
//     alert("Les nouveaux mots de passe ne correspondent pas");
//     return;
//   }

//   if (currentPassword === newPassword) {
//     alert("Le nouveau mot de passe doit être différent de l'ancien");
//     return;
//   }

//   // Afficher un indicateur de chargement
//   savePasswordBtn.textContent = "Changement...";
//   savePasswordBtn.disabled = true;

//   const result = await updatePassword(currentPassword, newPassword);

//   if (result.success) {
//     alert("Mot de passe changé avec succès !");
//     pwdModal.style.display = "none";
//   } else {
//     alert(result.error || "Erreur lors du changement de mot de passe");
//   }

//   // Réinitialiser le bouton
//   savePasswordBtn.textContent = "Enregistrer";
//   savePasswordBtn.disabled = false;
// });

// // Fermer le modal si on clique en dehors
// window.addEventListener("click", (event) => {
//   if (event.target === pwdModal) {
//     pwdModal.style.display = "none";
//   }
// });

// // Chargement des données utilisateur
// getCurrentUser().then((user) => {
//   if (!user) {
//     // Rediriger vers la page de connexion si non connecté
//     window.location.href = "login.html";
//     return;
//   }

//   currentUser = user;

//   console.log("Utilisateur chargé:", user);

//   // Mettre à jour l'affichage
//   userNameElem.textContent = user.username || "Utilisateur";
//   nbBetElem.textContent = user.nb_paris_crees || 0;
//   nbBetWon.textContent = user.nb_paris_gagnes || 0;

//   // Calculer le ratio si possible
//   if (user.nb_paris_crees > 0) {
//     const ratio = Math.round(
//       (user.nb_paris_gagnes / user.nb_paris_crees) * 100
//     );
//     ratioElem.textContent = `${ratio}%`;
//   } else {
//     ratioElem.textContent = "0%";
//   }

//   // Remplir les champs
//   mailInput.value = user.email || "";
//   userNameInput.value = user.username || "";
// });

const userNameElem = document.querySelector(".user-name");
const nbBetElem = document.querySelector(".nb-bet");
const nbBetWon = document.querySelector(".won-bet");
const ratioElem = document.querySelector(".ratio");

const mailInput = document.getElementById("email");
const userNameInput = document.getElementById("username");

const cancelBtn = document.querySelector(".cancel");
const saveBtn = document.querySelector(".save-button");
const editBtn = document.querySelector(".edit-button");
const editPwdBtn = document.querySelector(".edit-pwd-button");

// Éléments du modal mot de passe
const pwdModal = document.getElementById("pwd-modal");
const cancelModalBtn = document.querySelector(".cancel-modal");
const savePasswordBtn = document.querySelector(".save-password");
const currentPwdInput = document.getElementById("current-password");
const newPwdInput = document.getElementById("new-password");
const confirmPwdInput = document.getElementById("confirm-password");
const pwdMessage = document.getElementById("pwd-message");

let currentUser = null;

// Initialisation : désactiver les champs et cacher les boutons de sauvegarde/annulation
mailInput.disabled = true;
userNameInput.disabled = true;
cancelBtn.style.display = "none";
saveBtn.style.display = "none";

// Fonction pour gérer les icônes oeil
function initPasswordToggles() {
  const toggles = document.querySelectorAll(".password-toggle");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = toggle.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const icon = toggle.querySelector(".eye-icon");

      if (input && icon) {
        // Basculer le type d'input
        const newType = input.type === "password" ? "text" : "password";
        input.type = newType;

        // Basculer l'icône
        if (newType === "text") {
          icon.classList.remove("hidden");
          icon.classList.add("visible");
          toggle.classList.add("visible");
        } else {
          icon.classList.remove("visible");
          icon.classList.add("hidden");
          toggle.classList.remove("visible");
        }
      }
    });
  });
}

// Fonction pour afficher/masquer le modal
function showModal() {
  pwdModal.classList.add("active");
  pwdModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function hideModal() {
  pwdModal.classList.remove("active");
  pwdModal.style.display = "none";
  document.body.style.overflow = "";
}

// Fonction pour afficher un message dans le modal
function showPwdMessage(text, type = "error") {
  if (pwdMessage) {
    pwdMessage.textContent = text;
    pwdMessage.className = "modal-message";
    if (type) {
      pwdMessage.classList.add(type);
    }
    pwdMessage.style.display = "block";
  }
}

function hidePwdMessage() {
  if (pwdMessage) {
    pwdMessage.style.display = "none";
    pwdMessage.textContent = "";
    pwdMessage.className = "modal-message";
  }
}

async function getCurrentUser() {
  const res = await fetch("/api/auth/data", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

async function updateUserdata(data) {
  console.log("Envoi des données au serveur:", data);

  const res = await fetch("/api/auth/data/update", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  console.log("Réponse du serveur:", result);
  return result;
}

async function updatePassword(currentPassword, newPassword) {
  const res = await fetch("/api/auth/update-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return await res.json();
}

// Bouton "Modifier" - Active le mode édition
editBtn.addEventListener("click", () => {
  console.log("Activation du mode édition");

  mailInput.disabled = false;
  userNameInput.disabled = false;

  // Afficher les boutons sauvegarder/annuler
  saveBtn.style.display = "inline-block";
  cancelBtn.style.display = "inline-block";

  // Cacher le bouton modifier
  editBtn.style.display = "none";

  // Focus sur le premier champ
  mailInput.focus();
});

// Bouton "Sauvegarder" - Sauvegarde les modifications
saveBtn.addEventListener("click", async () => {
  const newMail = mailInput.value.trim();
  const newUserName = userNameInput.value.trim();

  console.log("Tentative de sauvegarde:", { newMail, newUserName });

  // Validation basique
  if (!newMail || !newUserName) {
    alert("Tous les champs sont requis");
    return;
  }

  if (newMail === currentUser.email && newUserName === currentUser.username) {
    alert("Aucune modification détectée");
    return;
  }

  // Afficher un indicateur de chargement
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Sauvegarde...";
  saveBtn.disabled = true;

  const result = await updateUserdata({
    email: newMail,
    username: newUserName,
  });

  if (result.success) {
    // Mettre à jour l'affichage
    userNameElem.textContent = newUserName;
    currentUser.email = newMail;
    currentUser.username = newUserName;

    // Désactiver les champs et réinitialiser les boutons
    mailInput.disabled = true;
    userNameInput.disabled = true;
    cancelBtn.style.display = "none";
    saveBtn.style.display = "none";
    editBtn.style.display = "inline-block";

    saveBtn.textContent = originalText;
    saveBtn.disabled = false;

    alert("Profil mis à jour avec succès !");
  } else {
    // Afficher l'erreur
    alert(result.error || "Erreur lors de la mise à jour");
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
});

// Bouton "Annuler" - Annule les modifications
cancelBtn.addEventListener("click", () => {
  console.log("Annulation des modifications");

  // Réinitialiser les valeurs
  mailInput.value = currentUser.email;
  userNameInput.value = currentUser.username;

  // Désactiver les champs
  mailInput.disabled = true;
  userNameInput.disabled = true;

  // Réinitialiser les boutons
  cancelBtn.style.display = "none";
  saveBtn.style.display = "none";
  editBtn.style.display = "inline-block";

  saveBtn.disabled = false;
});

// Gestion du modal mot de passe
editPwdBtn.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Ouverture du modal mot de passe");

  // Réinitialiser les champs
  currentPwdInput.value = "";
  newPwdInput.value = "";
  confirmPwdInput.value = "";
  hidePwdMessage();

  // Réinitialiser les icônes oeil
  const icons = document.querySelectorAll(".eye-icon");
  icons.forEach((icon) => {
    icon.classList.remove("visible");
    icon.classList.add("hidden");
  });

  // Afficher le modal
  showModal();
});

cancelModalBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideModal();
});

// Fermer le modal avec la touche Échap
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pwdModal.classList.contains("active")) {
    hideModal();
  }
});

// Fermer le modal si on clique en dehors
pwdModal.addEventListener("click", (e) => {
  if (e.target === pwdModal) {
    hideModal();
  }
});

savePasswordBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const currentPassword = currentPwdInput.value;
  const newPassword = newPwdInput.value;
  const confirmPassword = confirmPwdInput.value;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showPwdMessage("Tous les champs sont requis", "error");
    return;
  }

  if (newPassword.length < 8) {
    showPwdMessage(
      "Le mot de passe doit contenir au moins 8 caractères",
      "error"
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showPwdMessage("Les nouveaux mots de passe ne correspondent pas", "error");
    return;
  }

  if (currentPassword === newPassword) {
    showPwdMessage(
      "Le nouveau mot de passe doit être différent de l'ancien",
      "error"
    );
    return;
  }

  // Afficher un indicateur de chargement
  savePasswordBtn.classList.add("loading");
  savePasswordBtn.disabled = true;

  const result = await updatePassword(currentPassword, newPassword);

  if (result.success) {
    showPwdMessage("Mot de passe changé avec succès !", "success");

    // Fermer le modal après 2 secondes
    setTimeout(() => {
      hideModal();
      // Réinitialiser les champs
      currentPwdInput.value = "";
      newPwdInput.value = "";
      confirmPwdInput.value = "";
    }, 2000);
  } else {
    showPwdMessage(
      result.error || "Erreur lors du changement de mot de passe",
      "error"
    );
  }

  // Réinitialiser le bouton
  savePasswordBtn.classList.remove("loading");
  savePasswordBtn.disabled = false;
});

// Chargement des données utilisateur
getCurrentUser().then((user) => {
  if (!user) {
    // Rediriger vers la page de connexion si non connecté
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  console.log("Utilisateur chargé:", user);

  // Mettre à jour l'affichage
  userNameElem.textContent = user.username || "Utilisateur";
  nbBetElem.textContent = user.nb_paris_crees || 0;
  nbBetWon.textContent = user.nb_paris_gagnes || 0;

  // Calculer le ratio si possible
  if (user.nb_paris_crees > 0) {
    const ratio = Math.round(
      (user.nb_paris_gagnes / user.nb_paris_crees) * 100
    );
    ratioElem.textContent = `${ratio}%`;
  } else {
    ratioElem.textContent = "0%";
  }

  // Remplir les champs
  mailInput.value = user.email || "";
  userNameInput.value = user.username || "";

  // Initialiser les toggles mot de passe
  initPasswordToggles();
});
