import { validateEmail, usernameValidation } from "./functions.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const userpseudo = document.getElementById("username");

  const confirmPasswordInput = document.getElementById("confirmPassword");
  const mailError = document.querySelector(".mail-erreur");
  const pwdError = document.querySelector(".pwd-error");
  const usernameError = document.querySelector(".username-erreur");

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

  initPasswordToggles();

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

  const authForm = document.querySelector(".auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pwd = passwordInput?.value || "";
      const confirm = confirmPasswordInput?.value || "";
      const emailVal = emailInput?.value?.trim() || "";
      const userVal = userpseudo?.value?.trim() || "";

      const hasErrors =
        (mailError && mailError.style.display === "flex") ||
        (usernameError && usernameError.style.display === "flex") ||
        (pwdError && pwdError.style.display === "flex");

      if (hasErrors) {
        return;
      }

      if (comparePasswords(pwd, confirm) === false) {
        if (pwdError) {
          pwdError.style.display = "flex";
          pwdError.textContent = "Les mots de passe ne correspondent pas";
        }
        return;
      }

      if (!validateEmail(emailVal)) {
        return;
      }

      if (!usernameValidation(userVal)) {
        return;
      }

      if (!pwdValidation(pwd)) {
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
        console.error("Erreur inscription :", err);
      }
    });
  }
});
