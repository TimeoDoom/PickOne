const cancelBetButton = document.getElementById("cancelBtn");
const betForm = document.getElementById("addElementModal");
const addBet = document.querySelector(".add-bet");
const addChoiceButton = document.getElementById("addChoiceBtn");

const moreOptionsCheckbox = document.getElementById("showAdvancedOptions");
const moreOptionsSection = document.getElementById("advancedOptions");

addBet.addEventListener("click", () => {
  betForm.style.display = "flex";
});

cancelBetButton.addEventListener("click", () => {
  betForm.style.display = "none";
});

moreOptionsCheckbox.addEventListener("change", () => {
  moreOptionsSection.style.display = moreOptionsCheckbox.checked
    ? "block"
    : "none";
});

let choicesIndex = 2;

addChoiceButton.addEventListener("click", () => {
  choicesIndex++;

  if (choicesIndex > 10) {
    addChoiceButton.style.display = "none";
    return;
  }

  const choicesContainer = document.createElement("div");
  choicesContainer.className = "array-item";

  choicesContainer.innerHTML = `
    <input
      id="betOpt${choicesIndex}"
      type="text"
      name="choice[]"
      placeholder="Option ${choicesIndex}"
      required
    />
    <button type="button" class="remove-item">−</button>
  `;

  const choicesList = document.getElementById("choicesContainer");
  choicesList.appendChild(choicesContainer);
});

const choicesList = document.getElementById("choicesContainer");
choicesList.addEventListener("click", (event) => {
  if (event.target.classList.contains("remove-item")) {
    const itemToRemove = event.target.parentElement;
    itemToRemove.remove();
    choicesIndex--;

    if (choicesIndex <= 10) {
      addChoiceButton.style.display = "block";
    }
  }
});

const betTitle = document.getElementById("elementTitle");
const betCat = document.getElementById("elementCategory");
const betDate = document.getElementById("expirationDate");
const betMise = document.getElementById("startingBet");
const betChoiceA = document.getElementById("betOptA");
const betChoiceB = document.getElementById("betOptB");
const betTags = document.getElementById("elementTags");
const betVisibility = document.getElementById("visibility");

// Gestion erreur sur le titre
const titleError = document.getElementById("title-error");
const MAX_LENGTH = 100;

betTitle.addEventListener("input", () => {
  const val = betTitle.value;
  if (val.length > MAX_LENGTH) {
    titleError.style.display = "block";
  } else {
    titleError.style.display = "none";
  }
});

// Gestion de la date
const dateError = document.getElementById("date-error");
const date = new Date();
const currentMonth = String(date.getMonth() + 1).padStart(2, "0");
const currentYear = date.getFullYear();
const currentDay = String(date.getDate()).padStart(2, "0");

const currentDate = `${currentYear}-${currentMonth}-${currentDay}`;
console.log(currentDate);

betDate.addEventListener("input", () => {
  const val = betDate.value;

  if (val <= currentDate) {
    dateError.style.display = "block";
  } else {
    dateError.style.display = "none";
  }
});

// type choisi
const betType = document.getElementById("elementType");

betType.addEventListener("change", () => {
  let userChoice = betType.selectedIndex;
});

// mise minimale et maximale
// Faire la requete pour connaitre le montant du wallet utilisateur
// puis verifier que la mise est inferieure ou egale a ce montant
// Mettre les infos dans un objet et l'envoyer en POST au serveur lors de la validation du formulaire
