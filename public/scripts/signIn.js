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
const pwdlengthError = passwordErros.children[0];
const pwdSpecialCharError = passwordErros.children[1];
const pwdUppercaseError = passwordErros.children[2];

pwdError.style.display = "none";

function validateEmail(emailInput) {
  const emailpattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailpattern.test(emailInput);
}

function usernameValidation(userpseudo) {
  const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
  return usernamePattern.test(userpseudo);
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

function comparePasswords(password, confirmPassword) {
  return password === confirmPassword;
}

emailInput.addEventListener("input", async () => {
  const value = emailInput.value.trim();
  if (value.length === 0) {
    mailError.style.display = "none";
    return;
  }

  const invalidFormat = !validateEmail(value);
  const taken = await emailIsTaken(value);

  if (invalidFormat || taken) {
    mailError.style.display = "flex";
    mailError.style.color = "#ff3636";
    mailError.style.marginLeft = "6px";
    mailError.textContent = invalidFormat
      ? "Format email invalide"
      : "Email déjà utilisé";
  } else {
    mailError.style.display = "none";
  }
});

userpseudo.addEventListener("input", async () => {
  const value = userpseudo.value.trim();

  const invalidUsername = !usernameValidation(value);
  const taken = await pseudoIsTaken(value);

  if (invalidUsername || taken) {
    usernameError.style.display = "flex";
    usernameError.style.color = "#ff3636";
    usernameError.style.marginLeft = "6px";
    usernameError.textContent = invalidUsername
      ? "Nom d'utilisateur non valide"
      : "Nom d'utilisateur déjà pris";
  } else {
    usernameError.style.display = "none";
  }
});

passwordInput.addEventListener("input", () => {
  const value = passwordInput.value;
  pwdValidation(value);
});

confirmPasswordInput.addEventListener("input", () => {
  const value = confirmPasswordInput.value;
  // hide error when the confirm field is empty
  if (!value || value.trim().length === 0) {
    pwdError.style.display = "none";
    return;
  }
  if (comparePasswords(passwordInput.value, value) === false) {
    pwdError.style.display = "flex";
  } else {
    pwdError.style.display = "none";
  }
});

const toggles = document.querySelectorAll(".password-toggle");
toggles.forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    const input = e.target.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
  });
});

async function registerUser(email, pseudo, mdp) {
  const res = await fetch("/api/registerUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pseudo, mdp }),
  });

  const data = await res.json();
}

async function emailIsTaken(email) {
  const res = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
  const data = await res.json();
  return data.exists;
}

async function pseudoIsTaken(userpseudo) {
  const res = await fetch(
    `/api/users/username/${encodeURIComponent(userpseudo)}`
  );
  const data = await res.json();
  return data.exists;
}

const authForm = document.querySelector(".auth-form");
if (authForm) {
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const pwd = passwordInput?.value || "";
    const confirm = confirmPasswordInput?.value || "";
    const emailVal = emailInput?.value?.trim() || "";
    const userVal = userpseudo?.value?.trim() || "";

    if (comparePasswords(pwd, confirm) === false) {
      if (pwdError) pwdError.style.display = "flex";
      return;
    } else {
      if (pwdError) pwdError.style.display = "none";
    }

    if (!validateEmail(emailVal)) {
      if (mailError) mailError.style.display = "flex";
      return;
    } else if (mailError) {
      mailError.style.display = "none";
    }

    if (!usernameValidation(userVal)) {
      if (usernameError) usernameError.style.display = "flex";
      return;
    } else if (usernameError) {
      usernameError.style.display = "none";
    }

    if (!pwdValidation(pwd)) return;

    registerUser(emailVal, userVal, pwd);
  });
}
