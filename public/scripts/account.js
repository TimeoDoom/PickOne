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
const logoutBtn = document.querySelector(".logout-button");

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
      e.stopPropagation();

      const targetId = toggle.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const icon = toggle.querySelector(".eye-icon");

      if (input && icon) {
        const newType = input.type === "password" ? "text" : "password";
        input.type = newType;

        if (newType === "text") {
          icon.classList.remove("hidden");
          icon.classList.add("visible");
          toggle.classList.add("visible");

          icon.style.animation = "eyeBlink 0.5s ease";
          setTimeout(() => {
            icon.style.animation = "";
          }, 500);
        } else {
          icon.classList.remove("visible");
          icon.classList.add("hidden");
          toggle.classList.remove("visible");
        }
      }
    });
  });
}

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

async function updateUserdata(data) {
  // ❌ ERREUR : mauvaise route
  // const res = await fetch("/api/auth/update", {

  // ✅ CORRECTION : utiliser la bonne route
  const res = await fetch("/api/auth/data/update", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await res.json();
}

async function getCurrentUser() {
  // ✅ Cette route est correcte
  const res = await fetch("/api/auth/data", {
    credentials: "include",
  });
  if (!res.ok) return null;
  return await res.json();
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
  mailInput.disabled = false;
  userNameInput.disabled = false;

  saveBtn.style.display = "inline-block";
  cancelBtn.style.display = "inline-block";

  editBtn.style.display = "none";

  mailInput.focus();
});

// Bouton "Sauvegarder" - Sauvegarde les modifications
saveBtn.addEventListener("click", async () => {
  const newMail = mailInput.value.trim();
  const newUserName = userNameInput.value.trim();

  if (!newMail || !newUserName) {
    alert("Tous les champs sont requis");
    return;
  }

  if (newMail === currentUser.email && newUserName === currentUser.username) {
    alert("Aucune modification détectée");
    return;
  }

  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Sauvegarde...";
  saveBtn.disabled = true;

  const result = await updateUserdata({
    email: newMail,
    userName: newUserName,
  });

  if (result.success) {
    userNameElem.textContent = newUserName;
    currentUser.email = newMail;
    currentUser.username = newUserName;

    mailInput.disabled = true;
    userNameInput.disabled = true;
    cancelBtn.style.display = "none";
    saveBtn.style.display = "none";
    editBtn.style.display = "inline-block";

    saveBtn.textContent = originalText;
    saveBtn.disabled = false;

    alert("Profil mis à jour avec succès !");
  } else {
    alert(result.error || "Erreur lors de la mise à jour");
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
});

// Bouton "Annuler" - Annule les modifications
cancelBtn.addEventListener("click", () => {
  mailInput.value = currentUser.email;
  userNameInput.value = currentUser.username;

  mailInput.disabled = true;
  userNameInput.disabled = true;

  cancelBtn.style.display = "none";
  saveBtn.style.display = "none";
  editBtn.style.display = "inline-block";

  saveBtn.disabled = false;
});

editPwdBtn.addEventListener("click", (e) => {
  e.preventDefault();

  currentPwdInput.value = "";
  newPwdInput.value = "";
  confirmPwdInput.value = "";
  hidePwdMessage();

  const icons = document.querySelectorAll(".eye-icon");
  icons.forEach((icon) => {
    icon.classList.remove("visible");
    icon.classList.add("hidden");
  });

  showModal();
});

cancelModalBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pwdModal.classList.contains("active")) {
    hideModal();
  }
});

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

  savePasswordBtn.classList.add("loading");
  savePasswordBtn.disabled = true;

  const result = await updatePassword(currentPassword, newPassword);

  if (result.success) {
    showPwdMessage("Mot de passe changé avec succès !", "success");

    setTimeout(() => {
      hideModal();
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

  savePasswordBtn.classList.remove("loading");
  savePasswordBtn.disabled = false;
});

getCurrentUser().then((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  // ✅ Utiliser les bons noms de colonnes de la BD (minuscules)
  userNameElem.textContent = user.username || "Utilisateur";
  nbBetElem.textContent = user.nb_paris_crees || 0;
  nbBetWon.textContent = user.nb_paris_gagnes || 0;

  if (user.nb_paris_crees > 0) {
    const ratio = Math.round(
      (user.nb_paris_gagnes / user.nb_paris_crees) * 100
    );
    ratioElem.textContent = `${ratio}%`;
  } else {
    ratioElem.textContent = "0%";
  }

  mailInput.value = user.email || "";
  userNameInput.value = user.username || "";

  initPasswordToggles();
});

// Bouton de déconnexion
logoutBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      window.location.href = "login.html";
    } else {
      alert("Erreur lors de la déconnexion");
    }
  } catch (err) {
    console.error("Erreur de déconnexion:", err);
    alert("Erreur lors de la déconnexion");
  }
});
