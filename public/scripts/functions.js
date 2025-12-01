export function validateEmail(emailInput) {
  const emailpattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailpattern.test(emailInput);
}

export function usernameValidation(userpseudo) {
  const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
  return usernamePattern.test(userpseudo);
}

export function pwdValidation(passwordInput) {
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
