export function validateEmail(emailInput) {
  const emailpattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailpattern.test(emailInput);
}

export function usernameValidation(userpseudo) {
  const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
  return usernamePattern.test(userpseudo);
}
