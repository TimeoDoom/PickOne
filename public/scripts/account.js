import { validateEmail, usernameValidation, pwdValidation } from "./functions";

const userNameElem = document.querySelector(".user-name");
const nbBetElem = document.querySelector(".nb-bet");
const nbBetWon = document.querySelector(".won-bet");
const ratioElem = document.querySelector(".ratio");
const ratio = "75%"; // calculer vrai valeur
const mailInput = document.getElementById("email");
const userNameInput = document.getElementById("username");
const pwdInput = document.getElementById("password");

async function getCurrentUser() {
  const res = await fetch("/api/auth/data", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

getCurrentUser().then((user) => {
  if (!user) {
    console.log("Aucun utilisateur connecté");
    return;
  }

  console.log(user);
  userNameElem.textContent = user.username || "Utilisateur";
  nbBetElem.textContent = user.nb_paris_crees;
  nbBetWon.textContent = user.nb_paris_gagnes;
  ratioElem.textContent = ratio;

  if(validateEmail(mailInput.value)) {
    
  }


});
