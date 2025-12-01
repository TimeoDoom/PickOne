import { validateEmail, usernameValidation } from "./functions.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const userpseudo = document.getElementById("username");
  const signInButton = document.querySelector(".auth-button");

  const confirmPasswordInput = document.getElementById("confirmPassword");
  const memUserLogIn = document.querySelector("input[type='checkbox']");
  const mailError = document.querySelector(".mail-erreur");
  const pwdError = document.querySelector(".pwd-error");
  const usernameError = document.querySelector(".username-erreur");
  const tooglePwd = document.querySelector(".password-toggle");

  const passwordErros = document.querySelector(".password-strength");
  const pwdlengthError = passwordErros
    ? passwordErros.children[0]
    : { style: {} };
  const pwdSpecialCharError = passwordErros
    ? passwordErros.children[1]
    : { style: {} };
  const pwdUppercaseError = passwordErros
    ? passwordErros.children[2]
    : { style: {} };

  if (pwdError) pwdError.style.display = "none";

  function comparePasswords(password, confirmPassword) {
    return password === confirmPassword;
  }

  function pwdValidation(passwordInput) {
    const pwdLength = /.{8,}/;
    const pwdSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;
    const pwdUppercase = /[A-Z]/;

    let isValid = true;

    if (!pwdLength.test(passwordInput)) {
      pwdlengthError.style.color = "#ff3636";
      isValid = false;
    } else {
      pwdlengthError.style.color = "#4CAF50";
    }

    if (!pwdSpecialChar.test(passwordInput)) {
      pwdSpecialCharError.style.color = "#ff3636";
      isValid = false;
    } else {
      pwdSpecialCharError.style.color = "#4CAF50";
    }

    if (!pwdUppercase.test(passwordInput)) {
      pwdUppercaseError.style.color = "#ff3636";
      isValid = false;
    } else {
      pwdUppercaseError.style.color = "#4CAF50";
    }

    return isValid;
  }

  if (emailInput) {
    emailInput.addEventListener("input", async () => {
      const value = emailInput.value.trim();
      if (value.length === 0) {
        if (mailError) mailError.style.display = "none";
        return;
      }

      const invalidFormat = !validateEmail(value);
      const taken = await emailIsTaken(value);

      if (invalidFormat || taken) {
        if (mailError) {
          mailError.style.display = "flex";
          mailError.style.color = "#ff3636";
          mailError.style.marginLeft = "6px";
          mailError.textContent = invalidFormat
            ? "Format email invalide"
            : "Email déjà utilisé";
        }
      } else {
        if (mailError) mailError.style.display = "none";
      }
    });
  }

  if (userpseudo) {
    userpseudo.addEventListener("input", async () => {
      const value = userpseudo.value.trim();

      const invalidUsername = !usernameValidation(value);
      const taken = await pseudoIsTaken(value);

      if (invalidUsername || taken) {
        if (usernameError) {
          usernameError.style.display = "flex";
          usernameError.style.color = "#ff3636";
          usernameError.style.marginLeft = "6px";
          usernameError.textContent = invalidUsername
            ? "Nom d'utilisateur non valide"
            : "Nom d'utilisateur déjà pris";
        }
      } else {
        if (usernameError) usernameError.style.display = "none";
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      const value = passwordInput.value;
      pwdValidation(value);
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => {
      const value = confirmPasswordInput.value;
      if (!value || value.trim().length === 0) {
        if (pwdError) pwdError.style.display = "none";
        return;
      }
      if (comparePasswords(passwordInput.value, value) === false) {
        if (pwdError) {
          pwdError.style.display = "flex";
          pwdError.textContent = "Les mots de passe ne correspondent pas";
        }
      } else {
        if (pwdError) pwdError.style.display = "none";
      }
    });
  }

  const toggles = document.querySelectorAll(".password-toggle");
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      const input = e.target.previousElementSibling;
      if (input) input.type = input.type === "password" ? "text" : "password";
    });
  });

  async function registerUser(email, pseudo, mdp) {
    const res = await fetch("/api/registerUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pseudo, mdp }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erreur lors de l'inscription");
    }

    return data;
  }

  async function emailIsTaken(email) {
    try {
      const res = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.exists;
    } catch (e) {
      return false;
    }
  }

  async function pseudoIsTaken(userpseudo) {
    try {
      const res = await fetch(
        `/api/users/username/${encodeURIComponent(userpseudo)}`
      );
      const data = await res.json();
      return data.exists;
    } catch (e) {
      return false;
    }
  }

  function showErrorNotification(message) {
    // Supprimer les notifications existantes
    const existingNotif = document.querySelector(".error-notif");
    if (existingNotif) {
      existingNotif.remove();
    }

    const notif = document.createElement("div");
    notif.classList.add("error-notif");

    notif.innerHTML = `
      <p><strong>Erreur lors de l'inscription</strong></p>
      <p>${message}</p>
    `;

    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff3636;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(notif);

    // Supprimer la notification après 5 secondes
    setTimeout(() => {
      if (notif.parentNode) {
        notif.parentNode.removeChild(notif);
      }
    }, 5000);
  }

  const authForm = document.querySelector(".auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pwd = passwordInput?.value || "";
      const confirm = confirmPasswordInput?.value || "";
      const emailVal = emailInput?.value?.trim() || "";
      const userVal = userpseudo?.value?.trim() || "";

      // Vérifier s'il y a des erreurs affichées
      const hasErrors =
        (mailError && mailError.style.display === "flex") ||
        (usernameError && usernameError.style.display === "flex") ||
        (pwdError && pwdError.style.display === "flex");

      if (hasErrors) {
        showErrorNotification(
          "Veuillez corriger les erreurs avant de soumettre"
        );
        return;
      }

      if (comparePasswords(pwd, confirm) === false) {
        if (pwdError) {
          pwdError.style.display = "flex";
          pwdError.textContent = "Les mots de passe ne correspondent pas";
        }
        showErrorNotification("Les mots de passe ne correspondent pas");
        return;
      }

      if (!validateEmail(emailVal)) {
        showErrorNotification("Format d'email invalide");
        return;
      }

      if (!usernameValidation(userVal)) {
        showErrorNotification("Nom d'utilisateur non valide");
        return;
      }

      if (!pwdValidation(pwd)) {
        showErrorNotification(
          "Le mot de passe ne respecte pas les critères de sécurité"
        );
        return;
      }

      try {
        const result = await registerUser(emailVal, userVal, pwd);

        if (result.success) {
          window.location.href = "../index.html";
        } else {
          throw new Error(result.error || "Erreur inconnue");
        }
      } catch (err) {
        showErrorNotification(err.message);
        console.error("Erreur inscription :", err);
      }
    });
  }
});
