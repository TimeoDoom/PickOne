// Fonction pour calculer le temps restant
function getTimeRemaining(deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;

  if (diff <= 0) return "Terminé";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Fonction améliorée pour calculer les pourcentages des votes
function calculatePercentages(votesA, votesB) {
  const total = votesA + votesB;

  // Si aucun vote, retourner 50/50 pour un affichage équilibré
  if (total === 0)
    return {
      percentA: 50,
      percentB: 50,
      displayA: "0",
      displayB: "0",
      total: 0,
    };

  // Calcul avec une décimale pour plus de précision
  const percentA = (votesA / total) * 100;
  const percentB = (votesB / total) * 100;

  // Affichage : si >= 10%, on affiche sans décimale, sinon avec 1 décimale
  const displayA =
    percentA >= 10 ? Math.round(percentA).toString() : percentA.toFixed(1);
  const displayB =
    percentB >= 10 ? Math.round(percentB).toString() : percentB.toFixed(1);

  return {
    percentA: Math.round(percentA), // Pour la largeur de la barre
    percentB: Math.round(percentB),
    displayA, // Pour l'affichage textuel
    displayB,
    total,
  };
}

// Fonction pour créer une carte de pari
function createBetCard(bet) {
  const timeRemaining = getTimeRemaining(bet.deadline);
  const votesA = bet.votes_a || 0;
  const votesB = bet.votes_b || 0;
  const { percentA, percentB, displayA, displayB, total } =
    calculatePercentages(votesA, votesB);

  // Formater la date
  const deadlineDate = new Date(bet.deadline);
  const formattedDate = deadlineDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Déterminer si c'est un pari "featured" (mis en avant)
  const isFeatured = bet.total_amount > 100 || bet.total_votes > 50;

  return `
    <div class="bet-card ${isFeatured ? "featured" : ""}" data-bet-id="${
      bet.idbet
    }">
      <div class="bet-header">
         <div class="bet-creator">
        <span class="creator-badge">${bet.creator_name}</span>
      </div>
        <span class="bet-time" title="Expire le ${formattedDate}">
          ⏱️ ${timeRemaining}
        </span>
      </div>
      
      <h3 class="bet-title">
        ${bet.title}
      </h3>
      
      <div class="bet-progress">
        <div class="progress-header">
          <span class="total-votes">${total} vote${total > 1 ? "s" : ""}</span>
        </div>
        
        <div class="progress-options">
          <div class="option-item yes">
            <div class="option-info">
              <span class="option-name">${bet.optiona}</span>
              <span class="option-percent">${displayA}%</span>
            </div>
            <div class="option-bar">
              <div class="option-fill" style="width: ${percentA}%"></div>
            </div>
            <span class="option-votes">${votesA} vote${votesA > 1 ? "s" : ""}</span>
          </div>
          
          <div class="option-item no">
            <div class="option-info">
              <span class="option-name">${bet.optionb}</span>
              <span class="option-percent">${displayB}%</span>
            </div>
            <div class="option-bar">
              <div class="option-fill" style="width: ${percentB}%"></div>
            </div>
            <span class="option-votes">${votesB} vote${votesB > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      
      <div class="bet-actions">
        <button class="bet-button yes" data-bet-id="${bet.idbet}" data-choice="${bet.optiona.replace(
          /"/g,
          "&quot;",
        )}">
          ${bet.optiona}
        </button>
        <button class="bet-button no" data-bet-id="${bet.idbet}" data-choice="${bet.optionb.replace(
          /"/g,
          "&quot;",
        )}">
          ${bet.optionb}
        </button>
      </div>
      
      ${
        bet.tags && bet.tags.length > 0
          ? `
        <div class="bet-tags">
          ${bet.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
}

// Charger tous les paris
async function loadBets() {
  try {
    console.log("Chargement des paris...");

    const response = await fetch("/api/allBets");

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const bets = await response.json();
    console.log(`${bets.length} paris récupérés`);

    const betGrid = document.querySelector(".bet-grid");

    if (!betGrid) {
      console.error("Element .bet-grid non trouvé dans le DOM");
      return;
    }

    // Vider la grille
    betGrid.innerHTML = "";

    if (bets.length === 0) {
      betGrid.innerHTML = `
        <div class="no-bets">
          <h3>Aucun pari disponible</h3>
          <p>Soyez le premier à créer un pari !</p>
          <button class="create-first-bet" onclick="openBetModal()">
            Créer mon premier pari
          </button>
        </div>
      `;
      return;
    }

    // Ajouter chaque carte de pari
    bets.forEach((bet) => {
      const betCard = createBetCard(bet);
      betGrid.insertAdjacentHTML("beforeend", betCard);
    });

    // Initialiser les événements après l'ajout
    initBetEvents();
  } catch (error) {
    console.error("Erreur lors du chargement des paris:", error);

    const betGrid = document.querySelector(".bet-grid");
    if (betGrid) {
      betGrid.innerHTML = `
        <div class="error-message">
          <h3>Erreur de chargement</h3>
          <p>Impossible de charger les paris. ${error.message}</p>
          <button onclick="loadBets()">Réessayer</button>
        </div>
      `;
    }
  }
}

// ============================================================================
// FONCTION SIMPLIFIÉE POUR VOTER SANS MISE
// ============================================================================

// Gérer les votes sur un pari (SANS PICKCOINS)
async function voteOnBet(betId, choice) {
  try {
    // 1. VÉRIFICATION DE LA CONNEXION (optionnelle)
    // Si vous voulez que seuls les utilisateurs connectés puissent voter :
    /*
    const userResponse = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!userResponse.ok) {
      showNotification("Vous devez être connecté pour voter !", "error");
      return;
    }

    const user = await userResponse.json();
    */

    // 2. ENVOI DU VOTE SIMPLE AU SERVEUR
    // On envoie juste le choix sans montant de mise
    const voteData = {
      betId: betId,
      choice: choice,
      // Pas de betAmount pour un vote simple
    };

    // Envoyer le vote au serveur
    const response = await fetch("/api/bets/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(voteData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showNotification(`Vous avez voté pour "${choice}" !`, "success");

      // Recharger les paris pour mettre à jour les stats
      loadBets();
    } else {
      showNotification(
        `Erreur: ${result.error || "Impossible de voter"}`,
        "error",
      );
    }
  } catch (error) {
    console.error("Erreur lors du vote:", error);
    showNotification("Erreur de connexion au serveur", "error");
  }
}

// ============================================================================
// ANCIENNE FONCTION POUR PARIER AVEC PICKCOINS (COMMENTÉE)
// ============================================================================
/*
async function voteOnBetWithCoins(betId, choice) {
  try {
    // Vérifier si l'utilisateur est connecté
    const userResponse = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!userResponse.ok) {
      showNotification("Vous devez être connecté pour parier !", "error");
      setTimeout(() => (window.location.href = "/login.html"), 1000);
      return;
    }

    const user = await userResponse.json();

    // Demander le montant du pari
    const betAmount = prompt(
      `Combien voulez-vous parier sur "${choice}" ?\n(Entrez un montant en pickCoins)`,
    );

    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
      showNotification("Montant invalide !", "error");
      return;
    }

    // Préparer les données du vote
    const voteData = {
      betId: betId,
      choice: choice,
      betAmount: parseFloat(betAmount),
      userId: user.id,
    };

    // Envoyer au serveur
    const response = await fetch("/api/bets/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(voteData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showNotification(
        `Pari de ${betAmount} pickCoins placé sur "${choice}" !`,
        "success",
      );
      loadBets();
    } else {
      showNotification(
        result.error || "Erreur lors du pari",
        "error",
      );
    }
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur de connexion au serveur", "error");
  }
}
*/

// Initialiser les événements
function initBetEvents() {
  // Gérer les clics sur les boutons de vote
  document.querySelectorAll(".bet-button").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const betId = this.dataset.betId;
      const choice = this.dataset.choice;
      if (betId && choice) {
        voteOnBet(betId, choice);
      }
    });
  });

  // Gérer les clics sur les cartes pour afficher les détails
  document.querySelectorAll(".bet-card").forEach((card) => {
    // Éviter que le clic sur les boutons déclenche l'ouverture de la modal
    card.addEventListener("click", function (e) {
      if (
        !e.target.classList.contains("bet-button") &&
        !e.target.closest(".bet-button")
      ) {
        const betId = this.dataset.betId;
        if (betId) {
          showBetDetails(betId);
        }
      }
    });
  });
}

// Afficher les détails d'un pari dans une modal
async function showBetDetails(betId) {
  try {
    // Récupérer les détails du pari
    const response = await fetch(`/api/bets/${betId}`);

    if (!response.ok) {
      throw new Error("Impossible de récupérer les détails du pari");
    }

    const data = await response.json();
    const bet = data.bet;
    const stats = data.stats || {};
    const recentVotes = data.recentVotes || [];
    const options = data.options || [];

    // Créer ou récupérer la modal
    let modal = document.getElementById("betDetailsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "betDetailsModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    // Formater la date
    const deadlineDate = new Date(bet.deadline);
    const formattedDate = deadlineDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Calculer les pourcentages avec la fonction améliorée
    const totalVotes = (stats.votes_a || 0) + (stats.votes_b || 0);
    const votesA = stats.votes_a || 0;
    const votesB = stats.votes_b || 0;
    const { displayA, displayB, percentA, percentB } = calculatePercentages(
      votesA,
      votesB,
    );

    // Créer le contenu HTML
    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${bet.title}</h2>
        <button class="close-modal">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="bet-info-grid">
          <div class="info-item">
            <span class="label">Catégorie</span>
            <span class="value category ${bet.category_name.toLowerCase()}">
              ${bet.category_name}
            </span>
          </div>
          
          <div class="info-item">
            <span class="label">Créé par</span>
            <span class="value">${bet.username}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Expire le</span>
            <span class="value">${formattedDate}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Total des votes</span>
            <span class="value">${totalVotes} vote${totalVotes > 1 ? "s" : ""}</span>
          </div>
        </div>
        
        <div class="bet-options">
          <h3>Résultats des votes</h3>
          <div class="options-grid">
            <div class="option-card ${
              bet.optiona === bet.winner_option ? "winner" : ""
            }">
              <div class="option-header">
                <h4>${bet.optiona}</h4>
                <span class="option-percent-large">${displayA}%</span>
              </div>
              <div class="option-stats">
                <span class="vote-count">${votesA} vote${votesA > 1 ? "s" : ""}</span>
              </div>
              <div class="progress-bar-large">
                <div class="progress-fill-large yes-fill" style="width: ${percentA}%">
                  <span class="progress-label">${displayA}%</span>
                </div>
              </div>
            </div>
            
            <div class="option-card ${
              bet.optionb === bet.winner_option ? "winner" : ""
            }">
              <div class="option-header">
                <h4>${bet.optionb}</h4>
                <span class="option-percent-large">${displayB}%</span>
              </div>
              <div class="option-stats">
                <span class="vote-count">${votesB} vote${votesB > 1 ? "s" : ""}</span>
              </div>
              <div class="progress-bar-large">
                <div class="progress-fill-large no-fill" style="width: ${percentB}%">
                  <span class="progress-label">${displayB}%</span>
                </div>
              </div>
            </div>
            
            ${options
              .map((option) => {
                const optionPercent =
                  totalVotes > 0 ? (option.voters_count / totalVotes) * 100 : 0;
                const displayPercent =
                  optionPercent >= 10
                    ? Math.round(optionPercent).toString()
                    : optionPercent.toFixed(1);

                return `
              <div class="option-card ${option.is_winner ? "winner" : ""}">
                <div class="option-header">
                  <h4>${option.option_text}</h4>
                  <span class="option-percent-large">${displayPercent}%</span>
                </div>
                <div class="option-stats">
                  <span class="vote-count">${option.voters_count || 0} vote${(option.voters_count || 0) > 1 ? "s" : ""}</span>
                </div>
                <div class="progress-bar-large">
                  <div class="progress-fill-large" style="width: ${Math.round(optionPercent)}%">
                    <span class="progress-label">${displayPercent}%</span>
                  </div>
                </div>
              </div>
            `;
              })
              .join("")}
          </div>
        </div>
        
        ${
          recentVotes.length > 0
            ? `
          <div class="recent-votes">
            <h3>Derniers votes</h3>
            <div class="votes-list">
              ${recentVotes
                .map(
                  (vote) => `
                <div class="vote-item">
                  <span class="voter">${vote.username}</span>
                  a voté pour
                  <span class="choice ${
                    vote.choix === bet.optiona ? "yes" : "no"
                  }">${vote.choix}</span>
                  <span class="time">${new Date(
                    vote.datevote,
                  ).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
        
        ${
          bet.details
            ? `
          <div class="bet-description">
            <h3>Description</h3>
            <p>${bet.details}</p>
          </div>
        `
            : ""
        }
      </div>
      
      <div class="modal-footer">
        <button class="btn secondary close-modal">Fermer</button>
        <button class="btn primary bet-vote-btn" data-bet-id="${
          bet.idbet
        }" data-choice="${bet.optiona}">
          Voter pour ${bet.optiona}
        </button>
        <button class="btn danger bet-vote-btn" data-bet-id="${
          bet.idbet
        }" data-choice="${bet.optionb}">
          Voter pour ${bet.optionb}
        </button>
      </div>
    </div>
  `;

    // Afficher la modal
    modal.style.display = "flex";

    // Gérer la fermeture
    modal.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    });

    // Ajouter les événements pour les boutons de vote dans la modal
    modal.querySelectorAll(".bet-vote-btn").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const betId = this.dataset.betId;
        const choice = this.dataset.choice;
        if (betId && choice) {
          voteOnBet(betId, choice); // Utilise la fonction simple sans mise
        }
      });
    });

    // Fermer en cliquant en dehors
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'affichage des détails:", error);
    showNotification("Impossible d'afficher les détails du pari", "error");
  }
}

// Fonction utilitaire pour afficher des notifications
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="notification-icon">${
      type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"
    }</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close">&times;</button>
  `;

  document.body.appendChild(notification);

  // Animation d'entrée
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Fermer au clic
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    });

  // Fermer automatiquement après 5 secondes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Ouvrir la modal de création de pari
function openBetModal() {
  const modal = document.getElementById("addElementModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

// Charger les paris au démarrage
document.addEventListener("DOMContentLoaded", () => {
  loadBets();

  // Recharger toutes les 30 secondes pour les mises à jour
  setInterval(loadBets, 30000);
});
