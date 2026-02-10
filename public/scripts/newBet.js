
// Modal variables
const cancelBetButton = document.getElementById("cancelBtn");
const betForm = document.getElementById("addElementModal");
const addBet = document.querySelector(".add-bet");
const addChoiceButton = document.getElementById("addChoiceBtn");
const moreOptionsCheckbox = document.getElementById("showAdvancedOptions");
const moreOptionsSection = document.getElementById("advancedOptions");
const addElementForm = document.getElementById("addElementForm");

// Form elements
const betTitle = document.getElementById("elementTitle");
const betCat = document.getElementById("elementCategory");
const betType = document.getElementById("elementType");
const betDate = document.getElementById("expirationDate");
const betMise = document.getElementById("startingBet");
const betTags = document.getElementById("elementTags");
const betVisibility = document.getElementById("visibility");
const maxParticipants = document.getElementById("maxParticipants");

// Messages
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");
const titleError = document.getElementById("title-error");
const dateError = document.getElementById("date-error");

// Constants
const MAX_TITLE_LENGTH = 100;
const MAX_CHOICES = 10;
const MIN_CHOICES = 2;
let choicesIndex = 2;

// ============================
// MODAL MANAGEMENT
// ============================

// Ouvrir la modal
addBet.addEventListener("click", () => {
  betForm.style.display = "flex";
  resetForm();
});

// Fermer la modal
cancelBetButton.addEventListener("click", () => {
  betForm.style.display = "none";
  resetForm();
});

// ============================
// VALIDATION FUNCTIONS
// ============================

// Validation du titre
betTitle.addEventListener("input", () => {
  const val = betTitle.value.trim();
  if (val.length > MAX_TITLE_LENGTH) {
    titleError.style.display = "block";
    betTitle.classList.add("error");
  } else {
    titleError.style.display = "none";
    betTitle.classList.remove("error");
  }
});

// Validation de la date
betDate.addEventListener("change", () => {
  const selectedDate = new Date(betDate.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate <= today) {
    dateError.style.display = "block";
    betDate.classList.add("error");
  } else {
    dateError.style.display = "none";
    betDate.classList.remove("error");
  }
});

// Validation de la mise
// betMise.addEventListener("input", () => {
//   const value = parseFloat(betMise.value);
//   if (value < 0.01) {
//     betMise.value = "0.01";
//   }
// });

// Fonction de validation complète
function validateForm(formData) {
  const errors = [];

  // Titre
  if (!formData.title || formData.title.trim().length === 0) {
    errors.push("Le titre est requis");
  }

  if (formData.title.length > MAX_TITLE_LENGTH) {
    errors.push(
      "Le titre est trop long (max " + MAX_TITLE_LENGTH + " caractères)",
    );
  }

  // Date
  const selectedDate = new Date(formData.expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!formData.expirationDate) {
    errors.push("La date d'expiration est requise");
  } else if (selectedDate <= today) {
    errors.push("La date doit être future");
  }

  // Choix
  if (!formData.choices || formData.choices.length < MIN_CHOICES) {
    errors.push("Au moins " + MIN_CHOICES + " choix sont requis");
  }

  // Vérifier les doublons dans les choix
  const uniqueChoices = [
    ...new Set(formData.choices.map((c) => c.trim().toLowerCase())),
  ];
  if (uniqueChoices.length !== formData.choices.length) {
    errors.push("Les choix ne peuvent pas être identiques");
  }

  return errors;
}

// ============================
// FORM SUBMISSION
// ============================

addElementForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Afficher l'état de chargement
  const submitBtn = document.getElementById("submitBtn");
  const buttonText = submitBtn.querySelector(".button-text");
  const buttonLoading = submitBtn.querySelector(".button-loading");

  buttonText.style.display = "none";
  buttonLoading.style.display = "inline-block";
  submitBtn.disabled = true;

  // Récupérer les données du formulaire
  const formData = new FormData(addElementForm);
  const choices = Array.from(formData.getAll("choice[]")).filter(
    (c) => c.trim() !== "",
  );

  const betData = {
    title: formData.get("title").trim(),
    category: formData.get("category") || "TECH",
    type: formData.get("type") || "oui/non",
    expirationDate: formData.get("expirationDate"),
    startingBet: formData.get("startingBet")
      ? parseFloat(formData.get("startingBet"))
      : 0.01,
    choices: choices.map((c) => c.trim()),
    tags: formData.get("tags")
      ? formData
          .get("tags")
          .split(",")
          .map((tag) => tag.trim())
      : [],
    visibility: formData.get("visibility") || "public",
    maxParticipants: formData.get("maxParticipants")
      ? parseInt(formData.get("maxParticipants"))
      : null,
  };

  // Validation
  const errors = validateForm(betData);

  if (errors.length > 0) {
    showError(errors.join("<br>"));
    buttonText.style.display = "inline-block";
    buttonLoading.style.display = "none";
    submitBtn.disabled = false;
    return;
  }

  try {
    // Récupérer l'ID utilisateur et le solde du wallet
    const userResponse = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!userResponse.ok) {
      throw new Error("Erreur d'authentification");
    }

    const user = await userResponse.json();

    // // Vérifier le solde du wallet
    // const walletResponse = await fetch("/api/auth/data", {
    //   credentials: "include",
    // });

    // if (!walletResponse.ok) {
    //   throw new Error("Erreur lors de la récupération du wallet");
    // }

    // const userData = await walletResponse.json();

    // // Vérifier si l'utilisateur a assez d'argent
    // if (userData.wallet < betData.startingBet) {
    //   showError("Solde insuffisant dans votre wallet");
    //   buttonText.style.display = "inline-block";
    //   buttonLoading.style.display = "none";
    //   submitBtn.disabled = false;
    //   return;
    // }

    // Préparer les données pour l'API
    const apiData = {
      ...betData,
      creatorId: user.id,
      deadline: betData.expirationDate + " 23:59:59", // Format pour PostgreSQL
      betAmount: betData.startingBet,
      userId: user.id,
    };

    // Envoyer la requête au serveur
    const response = await fetch("/api/bets/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showSuccess("Pari créé avec succès !");

      // Réinitialiser le formulaire après 2 secondes
      setTimeout(() => {
        resetForm();
        betForm.style.display = "none";

        // Rafraîchir la liste des paris si nécessaire
        if (typeof refreshBetsList === "function") {
          refreshBetsList();
        }
      }, 2000);
    } else {
      showError(result.error || "Erreur lors de la création du pari");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showError("Erreur de connexion au serveur");
  } finally {
    // Réafficher le bouton normal
    buttonText.style.display = "inline-block";
    buttonLoading.style.display = "none";
    submitBtn.disabled = false;
  }
});

// ============================
// UTILITY FUNCTIONS
// ============================

function showSuccess(message) {
  successMessage.innerHTML = `✓ ${message}`;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";

  // Masquer après 5 secondes
  setTimeout(() => {
    successMessage.style.display = "none";
  }, 5000);
}

function showError(message) {
  errorMessage.innerHTML = `✗ ${message}`;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";

  // Masquer après 5 secondes
  setTimeout(() => {
    errorMessage.style.display = "none";
  }, 5000);
}

function resetForm() {
  addElementForm.reset();

  // Réinitialiser les choix
  const choicesContainer = document.getElementById("choicesContainer");
  const defaultChoices = choicesContainer.querySelectorAll(".array-item");

  // Garder seulement les 2 premiers choix
  for (let i = 2; i < defaultChoices.length; i++) {
    defaultChoices[i].remove();
  }

  // Réinitialiser les valeurs des 2 premiers choix
  const firstChoice = choicesContainer.querySelector(
    ".array-item:nth-child(1) input",
  );
  const secondChoice = choicesContainer.querySelector(
    ".array-item:nth-child(2) input",
  );

  if (firstChoice) firstChoice.value = "";
  if (secondChoice) secondChoice.value = "";

  // Réafficher le bouton d'ajout
  // addChoiceButton.style.display = "block";
  // choicesIndex = 2;

  // Masquer les messages
  successMessage.style.display = "none";
  errorMessage.style.display = "none";
  titleError.style.display = "none";
  dateError.style.display = "none";

  // Réinitialiser les styles d'erreur
  betTitle.classList.remove("error");
  betDate.classList.remove("error");
  // moreOptionsSection.style.display = "none";
  // moreOptionsCheckbox.checked = false;
}

// ============================
// WALLET
// ============================

// Vérifier le solde du wallet au chargement
async function updateWalletDisplay() {
  try {
    const walletDisplay = document.getElementById("wallet");
    if (!walletDisplay) return;

    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();
      console.log("Utilisateur connecté:", userData.username);

      // Maintenant, récupérer les données complètes pour le wallet
      const userDetails = await fetch("/api/auth/data", {
        credentials: "include",
      });

      if (userDetails.ok) {
        const userFullData = await userDetails.json();
        console.log("Solde du wallet:", userFullData.wallet);
        walletDisplay.textContent = `${parseFloat(userFullData.wallet).toFixed(2)} pickCoins`;
        return userFullData.wallet;
      }
    } else {
      console.log(" Non connecté");
      walletDisplay.textContent = "0.00 pickCoins";
      return 0;
    }
  } catch (error) {
    console.error("Erreur récupération wallet:", error);
    const walletDisplay = document.getElementById("wallet");
    if (walletDisplay) {
      walletDisplay.textContent = "0.00 pickCoins";
    }
    return 0;
  }
}

updateWalletDisplay();
