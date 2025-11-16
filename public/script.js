// // ---------- État ----------
// let connected = false;
// let editingCard = null;
// window.currentUserId = null; // Ajoutez cette ligne

// const ADMIN_ID = "1";
// const ADMIN_PASSWORD = "admin123";

// const addBetButton = document.querySelector(".add-bet");
// const connectionButton = document.querySelector(".connection-button");
// connectionButton.textContent = "Connexion / Inscription";
// const betGrid = document.querySelector(".bet-grid");

// // ---------- Overlays (création / connexion) ----------
// const addBetFormOverlay = document.createElement("div");
// addBetFormOverlay.classList.add("overlay");
// addBetFormOverlay.innerHTML = `
//   <div class="overlay-content">
//     <h2 id="overlay-title">Ajouter un nouveau pari</h2>
//     <input class="bet-title" type="text" placeholder="Nom du pari" />
//     <textarea class="bet-desc" placeholder="Description du pari"></textarea>
//     <label>Options de pari : (facultatif)</label>
//     <input class="persoOui" type="text" placeholder="oui" />
//     <input class="persoNon" type="text" placeholder="non"/>
//     <div style="display:flex;gap:8px;margin-top:8px;">
//       <input class="bet-date" type="date" />
//       <input class="bet-time" type="time" value="12:00" />
//     </div>
//     <p class="error-message" style="display:none;color:red;margin-top:8px;"></p>
//     <div class="overlay-options" style="margin-top:12px;">
//       <button class="submit-bet">Soumettre</button>
//       <button class="close-overlay">Fermer</button>
//     </div>
//   </div>
// `;

// const connectionOverlay = document.createElement("div");
// connectionOverlay.classList.add("overlay");
// connectionOverlay.innerHTML = `
//   <div class="overlay-content">
//     <h2>Connexion</h2>
//     <input class="conn-username" type="text" placeholder="Nom utilisateur" />
//     <input class="conn-password" type="password" placeholder="Mot de passe" />
//     <p class="conn-error" style="display:none;color:red;margin-top:8px;"></p>
//     <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
//       <button class="submit-admin-pass">Se connecter</button>
//       <button class="close-overlay">Annuler</button>
//     </div>
//   </div>
// `;

// // Ajout overlays au DOM (mais cachés)
// document.body.appendChild(addBetFormOverlay);
// document.body.appendChild(connectionOverlay);
// addBetFormOverlay.style.display = "none";
// connectionOverlay.style.display = "none";

// // ---------- Helpers ----------
// function showOverlay(overlay) {
//   overlay.style.display = "flex";
// }
// function hideOverlay(overlay) {
//   overlay.style.display = "none";
// }
// function formatDaysLeft(deadlineISO) {
//   if (!deadlineISO) return "Date manquante";

//   const deadline = new Date(deadlineISO);

//   if (isNaN(deadline.getTime())) {
//     console.error("Date invalide:", deadlineISO);
//     return "Date invalide";
//   }

//   const now = new Date();
//   const diff = deadline.getTime() - now.getTime();

//   if (diff <= 0) return "Expiré";

//   const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//   const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

//   return `${days}j ${hours}h restants`;
// }

// // --- nouveau helper pour vérifier expiration ---
// function isExpired(deadlineISO) {
//   if (!deadlineISO) return false;
//   const d = new Date(deadlineISO);
//   if (isNaN(d.getTime())) return false;
//   return d.getTime() <= Date.now();
// }

// function clearForm() {
//   addBetFormOverlay.querySelector(".bet-title").value = "";
//   addBetFormOverlay.querySelector(".bet-desc").value = "";
//   addBetFormOverlay.querySelector(".persoOui").value = "";
//   addBetFormOverlay.querySelector(".persoNon").value = "";
//   addBetFormOverlay.querySelector(".bet-date").value = "";
//   addBetFormOverlay.querySelector(".bet-time").value = "12:00";
//   addBetFormOverlay.querySelector(".error-message").style.display = "none";
// }
// function showFormError(msg) {
//   const e = addBetFormOverlay.querySelector(".error-message");
//   e.textContent = msg;
//   e.style.display = "block";
// }
// function validateFormInputs(title, dateStr) {
//   if (!title || title.trim() === "") {
//     showFormError("Le titre du pari est obligatoire.");
//     return false;
//   }
//   if (title.trim().length > 254) {
//     showFormError("Le titre du pari est trop long.");
//     return false;
//   }
//   if (!dateStr) {
//     showFormError("Veuillez sélectionner une date.");
//     return false;
//   }
//   const nowDate = new Date();
//   const iso = dateStr; // dateStr attendu au format YYYY-MM-DD
//   const timeInput =
//     addBetFormOverlay.querySelector(".bet-time").value || "12:00";
//   const deadlineISO = `${iso}T${timeInput}:00`;
//   if (new Date(deadlineISO) <= nowDate) {
//     showFormError("La date sélectionnée est déjà passée.");
//     return false;
//   }
//   addBetFormOverlay.querySelector(".error-message").style.display = "none";
//   return true;
// }

// // ---------- UI admin (boutons sur les cartes) ----------
// function setAdminButtonsOnCard(card) {
//   const adminDiv = card.querySelector(".admin-interactions");
//   if (!adminDiv) return;
//   adminDiv.innerHTML = `
//     <button class="edit-bet">Éditer</button>
//     <button class="delete-bet">Supprimer</button>
//   `;
// }
// function enableAdminInteractions() {
//   document.querySelectorAll(".bet-card").forEach(setAdminButtonsOnCard);
// }
// function disableAdminInteractions() {
//   document
//     .querySelectorAll(".admin-interactions")
//     .forEach((d) => (d.innerHTML = ""));
// }
// function toggleConnectionUI() {
//   connectionButton.textContent = connected
//     ? "Se déconnecter"
//     : "Connexion / Inscription";
//   if (connected) enableAdminInteractions();
//   else disableAdminInteractions();
// }

// // ---------- Création / affichage de cartes ----------
// function buildCardElement(pariData, hasVoted = false) {
//   const card = document.createElement("div");
//   card.classList.add("bet-card");

//   const expired = isExpired(pariData.deadline);
//   if (hasVoted) {
//     card.classList.add("voted");
//   }
//   if (expired) {
//     card.classList.add("expired");
//   }

//   card.dataset.deadline = pariData.deadline;
//   card.dataset.pariId = pariData.idbet;
//   card.dataset.hasVoted = hasVoted;
//   card.dataset.isExpired = expired;

//   const votesA = pariData.beta || 0;
//   const votesB = pariData.betb || 0;
//   const totalVotes = votesA + votesB;
//   const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
//   const pctB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

//   // Si expiré, afficher "Expiré" à la place du calcul de jours restants
//   const daysText = expired ? "Expiré" : formatDaysLeft(pariData.deadline);

//   card.innerHTML = `
//     <div class="bet-header">
//       <h2 class="bet-title">${escapeHtml(pariData.title)}</h2>
//       <p class="bet-date"><span class="days-left">${escapeHtml(
//         daysText
//       )}</span></p>
//       ${hasVoted ? '<div class="voted-badge">✓ Déjà voté</div>' : ""}
//       ${expired ? '<div class="expired-badge">⏰ Expiré</div>' : ""}
//     </div>
//     <p class="bet-desc-view">${escapeHtml(pariData.description || "")}</p>
//     <div class="bet-options">
//       <button class="yes ${hasVoted || expired ? "disabled" : ""}">${escapeHtml(
//     pariData.optiona || "Oui"
//   )}</button>
//       <div class="vote-center">
//         <div class="slide-bar">
//           <div class="green" style="width: ${pctA}%"></div>
//           <div class="red" style="width: ${pctB}%"></div>
//         </div>
//         <div class="pct-text">
//           <span class="pct-oui">${pctA}%</span> / <span class="pct-non">${pctB}%</span>
//         </div>
//       </div>
//       <button class="no ${hasVoted || expired ? "disabled" : ""}">${escapeHtml(
//     pariData.optionb || "Non"
//   )}</button>
//     </div>
//     <div class="admin-interactions"></div>
//   `;

//   if (connected) setAdminButtonsOnCard(card);

//   // Si expiré, on peut aussi atténuer visuellement via style inline si pas de CSS
//   if (expired) {
//     card.style.opacity = "0.6";
//     card.style.pointerEvents = "auto"; // on veut encore pouvoir cliquer pour voir détails mais pas pour voter
//   }

//   return card;
// }

// function votesPercentage(nbVoteA = 0, nbVoteB = 0) {
//   const total = nbVoteA + nbVoteB;

//   const pctA = (nbVoteA * 100) / total || 0;
//   const pctB = (nbVoteB * 100) / total || 0;
// }

// // ---------- Échappement simple pour éviter injection quand on insère du texte utilisateur ----------
// function escapeHtml(s) {
//   return (s || "")
//     .toString()
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#039;");
// }

// // ---------- Événements overlays / boutons ----------
// addBetButton.addEventListener("click", () => {
//   editingCard = null;
//   addBetFormOverlay.querySelector("#overlay-title").textContent =
//     "Ajouter un nouveau pari";
//   clearForm();
//   showOverlay(addBetFormOverlay);
// });

// addBetFormOverlay
//   .querySelector(".close-overlay")
//   .addEventListener("click", () => {
//     hideOverlay(addBetFormOverlay);
//     editingCard = null;
//     clearForm();
//   });

// connectionOverlay
//   .querySelector(".close-overlay")
//   .addEventListener("click", () => {
//     hideOverlay(connectionOverlay);
//   });

// connectionButton.addEventListener("click", () => {
//   // si déjà connecté => logout
//   if (connected) {
//     connected = false;
//     toggleConnectionUI();
//     return;
//   }
//   // sinon ouvrir overlay connexion
//   connectionOverlay.querySelector(".conn-username").value = "";
//   connectionOverlay.querySelector(".conn-password").value = "";
//   connectionOverlay.querySelector(".conn-error").style.display = "none";
//   showOverlay(connectionOverlay);
// });

// connectionOverlay
//   .querySelector(".submit-admin-pass")
//   .addEventListener("click", () => {
//     const u = connectionOverlay.querySelector(".conn-username").value;
//     const p = connectionOverlay.querySelector(".conn-password").value;
//     const err = connectionOverlay.querySelector(".conn-error");
//     if (u === ADMIN_ID && p === ADMIN_PASSWORD) {
//       connected = true;
//       hideOverlay(connectionOverlay);
//       toggleConnectionUI();
//     } else {
//       err.textContent = "Identifiants incorrects";
//       err.style.display = "block";
//     }
//   });

// // Submit du formulaire : création
// addBetFormOverlay.querySelector(".submit-bet").addEventListener("click", () => {
//   const title = addBetFormOverlay.querySelector(".bet-title").value;
//   const desc = addBetFormOverlay.querySelector(".bet-desc").value;
//   const optA = addBetFormOverlay.querySelector(".persoOui").value || "Oui";
//   const optB = addBetFormOverlay.querySelector(".persoNon").value || "Non";
//   const dateVal = addBetFormOverlay.querySelector(".bet-date").value; // YYYY-MM-DD
//   const timeVal = addBetFormOverlay.querySelector(".bet-time").value || "12:00";

//   if (!validateFormInputs(title, dateVal)) return;

//   const deadlineISO = `${dateVal}T${timeVal}:00`;

//   if (editingCard) {
//     updateBetInBD(
//       editingCard.dataset.pariId,
//       title,
//       desc,
//       deadlineISO,
//       optA,
//       optB
//     );
//   } else {
//     // création
//     addBetInBD(title, desc, deadlineISO, optA, optB, ADMIN_ID);
//   }

//   hideOverlay(addBetFormOverlay);
//   clearForm();
// });

// betGrid.addEventListener("click", (e) => {
//   const yesBtn = e.target.closest(".yes");
//   const noBtn = e.target.closest(".no");

//   // si on clique pas sur yes/no, on quitte
//   if (!yesBtn && !noBtn) return;

//   const card = (yesBtn || noBtn).closest(".bet-card");
//   if (!card) return;

//   // Empêcher vote si déjà voté ou expiré
//   if (card.dataset.hasVoted === "true") {
//     alert("Vous avez déjà voté pour ce pari !");
//     return;
//   }
//   if (card.dataset.isExpired === "true") {
//     alert("Ce pari est expiré, vous ne pouvez plus voter.");
//     return;
//   }

//   const pariId = card.dataset.pariId;
//   const optionAText = card.querySelector(".yes")?.textContent.trim() || "Oui";
//   const optionBText = card.querySelector(".no")?.textContent.trim() || "Non";

//   if (yesBtn) {
//     addVote(optionAText, pariId);
//   }

//   if (noBtn) {
//     addVote(optionBText, pariId);
//   }
// });

// // événements pour edit / delete
// betGrid.addEventListener("click", (e) => {
//   const editBtn = e.target.closest(".edit-bet");
//   const deleteBtn = e.target.closest(".delete-bet");

//   if (editBtn) {
//     const card = editBtn.closest(".bet-card");
//     if (!card) return;
//     editingCard = card;

//     // Préremplir formulaire depuis les attributs / contenus
//     addBetFormOverlay.querySelector("#overlay-title").textContent =
//       "Édition du pari";
//     addBetFormOverlay.querySelector(".bet-title").value =
//       card.querySelector(".bet-title").textContent;
//     addBetFormOverlay.querySelector(".bet-desc").value =
//       card.querySelector(".bet-desc-view").textContent;
//     addBetFormOverlay.querySelector(".persoOui").value =
//       card.querySelector(".yes").textContent;
//     addBetFormOverlay.querySelector(".persoNon").value =
//       card.querySelector(".no").textContent;

//     const iso = card.dataset.deadline || "";
//     if (iso) {
//       const d = new Date(iso);
//       addBetFormOverlay.querySelector(".bet-date").value = d
//         .toISOString()
//         .split("T")[0];
//       addBetFormOverlay.querySelector(".bet-time").value = d
//         .toTimeString()
//         .split(" ")[0]
//         .slice(0, 5);
//     } else {
//       addBetFormOverlay.querySelector(".bet-date").value = "";
//       addBetFormOverlay.querySelector(".bet-time").value = "12:00";
//     }

//     showOverlay(addBetFormOverlay);
//     return;
//   }

//   if (deleteBtn) {
//     const card = deleteBtn.closest(".bet-card");
//     if (!card) return;
//     if (confirm("Supprimer ce pari ?")) {
//       deleteBet(card.dataset.pariId).then(() => {
//         card.remove();
//       });
//     }
//     return;
//   }
// });

// // gestion BD

// async function fetchBets() {
//   try {
//     const res = await fetch("/api/paris");
//     const paris = await res.json();

//     console.log("Données reçues des paris:", paris);

//     betGrid.innerHTML = "";

//     // S'assurer que l'ID utilisateur existe
//     if (!window.currentUserId) {
//       let tempUserId = localStorage.getItem("tempUserId");
//       if (!tempUserId) {
//         tempUserId =
//           "anonymous_" +
//           Date.now() +
//           "_" +
//           Math.random().toString(36).substr(2, 9);
//         localStorage.setItem("tempUserId", tempUserId);
//       }
//       window.currentUserId = tempUserId;
//     }

//     // Récupérer les paris sur lesquels l'utilisateur a voté
//     const userVotes = await getUserVotes();

//     paris.forEach((pari) => {
//       const hasVoted = userVotes.some((vote) => vote.betid === pari.idbet);
//       const card = buildCardElement(pari, hasVoted);
//       betGrid.appendChild(card);
//     });
//   } catch (error) {
//     console.error("Erreur lors du chargement des paris :", error);
//   }
// }

// // Fonction pour récupérer les votes de l'utilisateur
// async function getUserVotes() {
//   try {
//     const res = await fetch(`/api/user/votes?userId=${window.currentUserId}`);
//     if (res.ok) {
//       return await res.json();
//     }
//     return [];
//   } catch (error) {
//     console.error("Erreur récupération votes:", error);
//     return [];
//   }
// }

// fetchBets();

// async function updateBetInBD(
//   pariId,
//   title,
//   description,
//   deadlineISO,
//   optionA,
//   optionB
// ) {
//   try {
//     console.log("updateBetInBD appelé avec ID:", pariId);

//     // Validation robuste de l'ID
//     if (
//       !pariId ||
//       pariId === "undefined" ||
//       pariId === "null" ||
//       pariId === "NaN"
//     ) {
//       throw new Error(`ID du pari invalide: "${pariId}"`);
//     }

//     const betData = {
//       title,
//       description: description || "",
//       deadline: deadlineISO,
//       optionA: optionA || "Oui",
//       optionB: optionB || "Non",
//     };

//     console.log("Envoi mise à jour pour ID:", pariId, "Données:", betData);

//     const res = await fetch(`/api/paris/${pariId}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(betData),
//     });

//     // Vérifier d'abord si la réponse est OK
//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Erreur HTTP ${res.status}: ${errorText}`);
//     }
//     let data;
//     try {
//       data = await res.json();
//     } catch (jsonError) {
//       data = { message: "Mise à jour réussie" };
//     }

//     // Recharger la liste
//     fetchBets();
//   } catch (error) {
//     alert("Erreur lors de la mise à jour: " + error.message);
//   }
// }

// async function deleteBet(pariId) {
//   try {
//     const betId = { pariId };
//     const res = await fetch(`/api/paris/${pariId}`, {
//       method: "DELETE",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(betId),
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(`Erreur HTTP ${res.status}: ${errorText}`);
//     }
//   } catch (error) {
//     alert("Erreur lors de la suppression: " + error.message);
//   }
// }

// async function addVote(choix, pariId) {
//   try {
//     // Générer un ID utilisateur anonyme unique par navigateur
//     if (!window.currentUserId) {
//       // Vérifier si on a déjà un ID temporaire dans le localStorage
//       let tempUserId = localStorage.getItem("tempUserId");

//       if (!tempUserId) {
//         // Générer un nouvel ID temporaire unique
//         tempUserId =
//           "anonymous_" +
//           Date.now() +
//           "_" +
//           Math.random().toString(36).substr(2, 9);
//         localStorage.setItem("tempUserId", tempUserId);
//       }

//       window.currentUserId = tempUserId;
//     }

//     console.log("Envoi du vote anonyme:", {
//       pariId,
//       userId: window.currentUserId,
//       choix: choix,
//     });

//     const res = await fetch(`/api/paris/${pariId}/vote`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         userId: window.currentUserId,
//         choix: choix,
//       }),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       if (res.status === 400 && data.message.includes("déjà voté")) {
//         alert("Vous avez déjà voté pour ce pari !");
//         // Recharger pour mettre à jour l'interface
//         fetchBets();
//       } else {
//         alert(data.message || "Erreur lors du vote");
//       }
//       return;
//     }

//     console.log("Vote réussi:", data);

//     // Marquer la carte comme votée IMMÉDIATEMENT
//     markCardAsVoted(pariId, choix);

//     // Message de succès
//     showVoteSuccessMessage(pariId);

//     // Recharger pour s'assurer que tout est synchronisé
//     setTimeout(() => {
//       fetchBets();
//     }, 1000);
//   } catch (err) {
//     console.error("Erreur fetch :", err);
//     alert("Erreur réseau lors du vote: " + err.message);
//   }
// }

// // Fonction pour marquer une carte comme votée immédiatement
// function markCardAsVoted(pariId, choix) {
//   const card = document.querySelector(`[data-pari-id="${pariId}"]`);
//   if (card) {
//     card.classList.add("voted");
//     card.dataset.hasVoted = "true";

//     // Ajouter le badge "Déjà voté"
//     const header = card.querySelector(".bet-header");
//     if (header && !header.querySelector(".voted-badge")) {
//       const badge = document.createElement("div");
//       badge.className = "voted-badge";
//       badge.textContent = `✓ Voté: ${choix}`;
//       header.appendChild(badge);
//     }

//     // Désactiver les boutons
//     const yesBtn = card.querySelector(".yes");
//     const noBtn = card.querySelector(".no");
//     if (yesBtn) yesBtn.classList.add("disabled");
//     if (noBtn) noBtn.classList.add("disabled");

//     // Mettre en évidence le choix de l'utilisateur
//     if (choix === yesBtn?.textContent.trim()) {
//       yesBtn.classList.add("user-choice");
//     } else if (choix === noBtn?.textContent.trim()) {
//       noBtn.classList.add("user-choice");
//     }
//   }
// }

// // Fonction pour afficher le message de succès
// function showVoteSuccessMessage(pariId) {
//   const card = document.querySelector(`[data-pari-id="${pariId}"]`);
//   if (card) {
//     const tempAlert = document.createElement("div");
//     tempAlert.textContent = "✓ Vote enregistré !";
//     tempAlert.style.cssText = `
//       position: absolute;
//       top: 10px;
//       right: 10px;
//       background: #4CAF50;
//       color: white;
//       padding: 8px 12px;
//       border-radius: 4px;
//       z-index: 1000;
//       font-size: 14px;
//       animation: fadeInOut 2s ease-in-out;
//     `;

//     if (!document.querySelector("#vote-animation")) {
//       const style = document.createElement("style");
//       style.id = "vote-animation";
//       style.textContent = `
//         @keyframes fadeInOut {
//           0% { opacity: 0; transform: translateY(-10px); }
//           20% { opacity: 1; transform: translateY(0); }
//           80% { opacity: 1; transform: translateY(0); }
//           100% { opacity: 0; transform: translateY(-10px); }
//         }
//       `;
//       document.head.appendChild(style);
//     }

//     card.style.position = "relative";
//     card.appendChild(tempAlert);

//     setTimeout(() => {
//       if (tempAlert.parentNode) {
//         tempAlert.parentNode.removeChild(tempAlert);
//       }
//     }, 2000);
//   }
// }

// async function addBetInBD(
//   title,
//   description,
//   deadlineISO,
//   optionA,
//   optionB,
//   creatorId
// ) {
//   try {
//     const betData = {
//       title,
//       description: description || "",
//       deadline: deadlineISO,
//       optionA: optionA || "Oui",
//       optionB: optionB || "Non",
//       creatorId: creatorId || ADMIN_ID,
//     };

//     console.log("Envoi des données:", betData);

//     const res = await fetch("/api/paris", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(betData),
//     });

//     const data = await res.json();
//     console.log("Réponse complète du serveur:", data);

//     if (!res.ok) {
//       console.error("Erreur serveur détaillée:", data);
//       alert("Erreur: " + (data.error || "Erreur inconnue"));
//       return;
//     }

//     // Recharger la liste
//     fetchBets();
//   } catch (error) {
//     console.error("Erreur réseau:", error);
//     alert("Erreur réseau: " + error.message);
//   }
// }

// ---------- État ----------
let connected = false;
let editingCard = null;
window.currentUserId = null;
window.adminId = null;

const addBetButton = document.querySelector(".add-bet");
const connectionButton = document.querySelector(".connection-button");
connectionButton.textContent = "Connexion Admin";
const betGrid = document.querySelector(".bet-grid");

// Cacher le bouton d'ajout par défaut
addBetButton.style.display = "none";

// ---------- Overlays (création / connexion) ----------
const addBetFormOverlay = document.createElement("div");
addBetFormOverlay.classList.add("overlay");
addBetFormOverlay.innerHTML = `
  <div class="overlay-content">
    <h2 id="overlay-title">Ajouter un nouveau pari</h2>
    <input class="bet-title" type="text" placeholder="Nom du pari" />
    <textarea class="bet-desc" placeholder="Description du pari"></textarea>
    <label>Options de pari : (facultatif)</label>
    <input class="persoOui" type="text" placeholder="oui" />
    <input class="persoNon" type="text" placeholder="non"/>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <input class="bet-date" type="date" />
      <input class="bet-time" type="time" value="12:00" />
    </div>
    <p class="error-message" style="display:none;color:red;margin-top:8px;"></p>
    <div class="overlay-options" style="margin-top:12px;">
      <button class="submit-bet">Soumettre</button>
      <button class="close-overlay">Fermer</button>
    </div>
  </div>
`;

const connectionOverlay = document.createElement("div");
connectionOverlay.classList.add("overlay");
connectionOverlay.innerHTML = `
  <div class="overlay-content">
    <h2>Connexion Admin</h2>
    <input class="conn-username" type="text" placeholder="Nom d'utilisateur" />
    <input class="conn-password" type="password" placeholder="Mot de passe" />
    <p class="conn-error" style="display:none;color:red;margin-top:8px;"></p>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
      <button class="submit-admin-pass">Se connecter</button>
      <button class="close-overlay">Annuler</button>
    </div>
  </div>
`;

// Ajout overlays au DOM (mais cachés)
document.body.appendChild(addBetFormOverlay);
document.body.appendChild(connectionOverlay);
addBetFormOverlay.style.display = "none";
connectionOverlay.style.display = "none";

// ---------- Helpers ----------
function showOverlay(overlay) {
  overlay.style.display = "flex";
}
function hideOverlay(overlay) {
  overlay.style.display = "none";
}
function formatDaysLeft(deadlineISO) {
  if (!deadlineISO) return "Date manquante";

  const deadline = new Date(deadlineISO);

  if (isNaN(deadline.getTime())) {
    console.error("Date invalide:", deadlineISO);
    return "Date invalide";
  }

  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return "Expiré";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return `${days}j ${hours}h restants`;
}

// --- nouveau helper pour vérifier expiration ---
function isExpired(deadlineISO) {
  if (!deadlineISO) return false;
  const d = new Date(deadlineISO);
  if (isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

function clearForm() {
  addBetFormOverlay.querySelector(".bet-title").value = "";
  addBetFormOverlay.querySelector(".bet-desc").value = "";
  addBetFormOverlay.querySelector(".persoOui").value = "";
  addBetFormOverlay.querySelector(".persoNon").value = "";
  addBetFormOverlay.querySelector(".bet-date").value = "";
  addBetFormOverlay.querySelector(".bet-time").value = "12:00";
  addBetFormOverlay.querySelector(".error-message").style.display = "none";
}
function showFormError(msg) {
  const e = addBetFormOverlay.querySelector(".error-message");
  e.textContent = msg;
  e.style.display = "block";
}
function validateFormInputs(title, dateStr) {
  if (!title || title.trim() === "") {
    showFormError("Le titre du pari est obligatoire.");
    return false;
  }
  if (title.trim().length > 254) {
    showFormError("Le titre du pari est trop long.");
    return false;
  }
  if (!dateStr) {
    showFormError("Veuillez sélectionner une date.");
    return false;
  }
  const nowDate = new Date();
  const iso = dateStr; // dateStr attendu au format YYYY-MM-DD
  const timeInput =
    addBetFormOverlay.querySelector(".bet-time").value || "12:00";
  const deadlineISO = `${iso}T${timeInput}:00`;
  if (new Date(deadlineISO) <= nowDate) {
    showFormError("La date sélectionnée est déjà passée.");
    return false;
  }
  addBetFormOverlay.querySelector(".error-message").style.display = "none";
  return true;
}

// ---------- UI admin (boutons sur les cartes) ----------
function setAdminButtonsOnCard(card) {
  const adminDiv = card.querySelector(".admin-interactions");
  if (!adminDiv) return;
  adminDiv.innerHTML = `
    <button class="edit-bet">Éditer</button>
    <button class="delete-bet">Supprimer</button>
  `;
}
function enableAdminInteractions() {
  document.querySelectorAll(".bet-card").forEach(setAdminButtonsOnCard);
}
function disableAdminInteractions() {
  document
    .querySelectorAll(".admin-interactions")
    .forEach((d) => (d.innerHTML = ""));
}
function toggleConnectionUI() {
  if (connected) {
    connectionButton.textContent = "Déconnexion Admin";
    addBetButton.style.display = "block";
    enableAdminInteractions();
  } else {
    connectionButton.textContent = "Connexion Admin";
    addBetButton.style.display = "none";
    disableAdminInteractions();
    window.adminId = null;
  }
}

// ---------- Création / affichage de cartes ----------
function buildCardElement(pariData, hasVoted = false) {
  const card = document.createElement("div");
  card.classList.add("bet-card");

  const expired = isExpired(pariData.deadline);
  if (hasVoted) {
    card.classList.add("voted");
  }
  if (expired) {
    card.classList.add("expired");
  }

  card.dataset.deadline = pariData.deadline;
  card.dataset.pariId = pariData.idbet;
  card.dataset.hasVoted = hasVoted;
  card.dataset.isExpired = expired;

  const votesA = pariData.beta || 0;
  const votesB = pariData.betb || 0;
  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

  // Si expiré, afficher "Expiré" à la place du calcul de jours restants
  const daysText = expired ? "Expiré" : formatDaysLeft(pariData.deadline);

  card.innerHTML = `
    <div class="bet-header">
      <h2 class="bet-title">${escapeHtml(pariData.title)}</h2>
      <p class="bet-date"><span class="days-left">${escapeHtml(
        daysText
      )}</span></p>
      ${hasVoted ? '<div class="voted-badge">✓ Déjà voté</div>' : ""}
      ${expired ? '<div class="expired-badge">⏰ Expiré</div>' : ""}
    </div>
    <p class="bet-desc-view">${escapeHtml(pariData.description || "")}</p>
    <div class="bet-options">
      <button class="yes ${hasVoted || expired ? "disabled" : ""}">${escapeHtml(
    pariData.optiona || "Oui"
  )}</button>
      <div class="vote-center">
        <div class="slide-bar">
          <div class="green" style="width: ${pctA}%"></div>
          <div class="red" style="width: ${pctB}%"></div>
        </div>
        <div class="pct-text">
          <span class="pct-oui">${pctA}%</span> / <span class="pct-non">${pctB}%</span>
        </div>
      </div>
      <button class="no ${hasVoted || expired ? "disabled" : ""}">${escapeHtml(
    pariData.optionb || "Non"
  )}</button>
    </div>
    <div class="admin-interactions"></div>
  `;

  if (connected) setAdminButtonsOnCard(card);

  // Si expiré, on peut aussi atténuer visuellement via style inline si pas de CSS
  if (expired) {
    card.style.opacity = "0.6";
    card.style.pointerEvents = "auto"; // on veut encore pouvoir cliquer pour voir détails mais pas pour voter
  }

  return card;
}

function votesPercentage(nbVoteA = 0, nbVoteB = 0) {
  const total = nbVoteA + nbVoteB;

  const pctA = (nbVoteA * 100) / total || 0;
  const pctB = (nbVoteB * 100) / total || 0;
}

// ---------- Échappement simple pour éviter injection quand on insère du texte utilisateur ----------
function escapeHtml(s) {
  return (s || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Fonction de vérification de connexion admin ----------
async function verifyAdminLogin(username, password) {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, adminId: data.adminId };
    } else {
      const error = await res.json();
      return { success: false, error: error.message };
    }
  } catch (err) {
    return { success: false, error: "Erreur de connexion" };
  }
}

// ---------- Événements overlays / boutons ----------
addBetButton.addEventListener("click", () => {
  if (!connected) {
    alert("Vous devez être connecté en tant qu'admin pour créer un pari");
    return;
  }

  editingCard = null;
  addBetFormOverlay.querySelector("#overlay-title").textContent =
    "Ajouter un nouveau pari";
  clearForm();
  showOverlay(addBetFormOverlay);
});

addBetFormOverlay
  .querySelector(".close-overlay")
  .addEventListener("click", () => {
    hideOverlay(addBetFormOverlay);
    editingCard = null;
    clearForm();
  });

connectionOverlay
  .querySelector(".close-overlay")
  .addEventListener("click", () => {
    hideOverlay(connectionOverlay);
  });

connectionButton.addEventListener("click", () => {
  // si déjà connecté => logout
  if (connected) {
    connected = false;
    toggleConnectionUI();
    return;
  }
  // sinon ouvrir overlay connexion
  connectionOverlay.querySelector(".conn-username").value = "";
  connectionOverlay.querySelector(".conn-password").value = "";
  connectionOverlay.querySelector(".conn-error").style.display = "none";
  showOverlay(connectionOverlay);
});

connectionOverlay
  .querySelector(".submit-admin-pass")
  .addEventListener("click", async () => {
    const username = connectionOverlay.querySelector(".conn-username").value;
    const password = connectionOverlay.querySelector(".conn-password").value;
    const err = connectionOverlay.querySelector(".conn-error");

    if (!username || !password) {
      err.textContent = "Veuillez remplir tous les champs";
      err.style.display = "block";
      return;
    }

    const result = await verifyAdminLogin(username, password);

    if (result.success) {
      connected = true;
      window.adminId = result.adminId;
      hideOverlay(connectionOverlay);
      toggleConnectionUI();
    } else {
      err.textContent = result.error || "Identifiants incorrects";
      err.style.display = "block";
    }
  });

// Submit du formulaire : création
addBetFormOverlay.querySelector(".submit-bet").addEventListener("click", () => {
  if (!connected || !window.adminId) {
    alert("Vous devez être connecté en tant qu'admin pour créer un pari");
    return;
  }

  const title = addBetFormOverlay.querySelector(".bet-title").value;
  const desc = addBetFormOverlay.querySelector(".bet-desc").value;
  const optA = addBetFormOverlay.querySelector(".persoOui").value || "Oui";
  const optB = addBetFormOverlay.querySelector(".persoNon").value || "Non";
  const dateVal = addBetFormOverlay.querySelector(".bet-date").value; // YYYY-MM-DD
  const timeVal = addBetFormOverlay.querySelector(".bet-time").value || "12:00";

  if (!validateFormInputs(title, dateVal)) return;

  const deadlineISO = `${dateVal}T${timeVal}:00`;

  if (editingCard) {
    updateBetInBD(
      editingCard.dataset.pariId,
      title,
      desc,
      deadlineISO,
      optA,
      optB
    );
  } else {
    // création
    addBetInBD(title, desc, deadlineISO, optA, optB, window.adminId);
  }

  hideOverlay(addBetFormOverlay);
  clearForm();
});

betGrid.addEventListener("click", (e) => {
  const yesBtn = e.target.closest(".yes");
  const noBtn = e.target.closest(".no");

  // si on clique pas sur yes/no, on quitte
  if (!yesBtn && !noBtn) return;

  const card = (yesBtn || noBtn).closest(".bet-card");
  if (!card) return;

  // Empêcher vote si déjà voté ou expiré
  if (card.dataset.hasVoted === "true") {
    alert("Vous avez déjà voté pour ce pari !");
    return;
  }
  if (card.dataset.isExpired === "true") {
    alert("Ce pari est expiré, vous ne pouvez plus voter.");
    return;
  }

  const pariId = card.dataset.pariId;
  const optionAText = card.querySelector(".yes")?.textContent.trim() || "Oui";
  const optionBText = card.querySelector(".no")?.textContent.trim() || "Non";

  if (yesBtn) {
    addVote(optionAText, pariId);
  }

  if (noBtn) {
    addVote(optionBText, pariId);
  }
});

// événements pour edit / delete
betGrid.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-bet");
  const deleteBtn = e.target.closest(".delete-bet");

  if (editBtn) {
    if (!connected) {
      alert("Vous devez être connecté en tant qu'admin pour modifier un pari");
      return;
    }

    const card = editBtn.closest(".bet-card");
    if (!card) return;
    editingCard = card;

    // Préremplir formulaire depuis les attributs / contenus
    addBetFormOverlay.querySelector("#overlay-title").textContent =
      "Édition du pari";
    addBetFormOverlay.querySelector(".bet-title").value =
      card.querySelector(".bet-title").textContent;
    addBetFormOverlay.querySelector(".bet-desc").value =
      card.querySelector(".bet-desc-view").textContent;
    addBetFormOverlay.querySelector(".persoOui").value =
      card.querySelector(".yes").textContent;
    addBetFormOverlay.querySelector(".persoNon").value =
      card.querySelector(".no").textContent;

    const iso = card.dataset.deadline || "";
    if (iso) {
      const d = new Date(iso);
      addBetFormOverlay.querySelector(".bet-date").value = d
        .toISOString()
        .split("T")[0];
      addBetFormOverlay.querySelector(".bet-time").value = d
        .toTimeString()
        .split(" ")[0]
        .slice(0, 5);
    } else {
      addBetFormOverlay.querySelector(".bet-date").value = "";
      addBetFormOverlay.querySelector(".bet-time").value = "12:00";
    }

    showOverlay(addBetFormOverlay);
    return;
  }

  if (deleteBtn) {
    if (!connected) {
      alert("Vous devez être connecté en tant qu'admin pour supprimer un pari");
      return;
    }

    const card = deleteBtn.closest(".bet-card");
    if (!card) return;
    if (confirm("Supprimer ce pari ?")) {
      deleteBet(card.dataset.pariId).then(() => {
        card.remove();
      });
    }
    return;
  }
});

// gestion BD

async function fetchBets() {
  try {
    const res = await fetch("/api/paris");
    const paris = await res.json();

    console.log("Données reçues des paris:", paris);

    betGrid.innerHTML = "";

    // S'assurer que l'ID utilisateur existe
    if (!window.currentUserId) {
      let tempUserId = localStorage.getItem("tempUserId");
      if (!tempUserId) {
        tempUserId =
          "anonymous_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substr(2, 9);
        localStorage.setItem("tempUserId", tempUserId);
      }
      window.currentUserId = tempUserId;
    }

    // Récupérer les paris sur lesquels l'utilisateur a voté
    const userVotes = await getUserVotes();

    paris.forEach((pari) => {
      const hasVoted = userVotes.some((vote) => vote.betid === pari.idbet);
      const card = buildCardElement(pari, hasVoted);
      betGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Erreur lors du chargement des paris :", error);
  }
}

// Fonction pour récupérer les votes de l'utilisateur
async function getUserVotes() {
  try {
    const res = await fetch(`/api/user/votes?userId=${window.currentUserId}`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch (error) {
    console.error("Erreur récupération votes:", error);
    return [];
  }
}

fetchBets();

async function updateBetInBD(
  pariId,
  title,
  description,
  deadlineISO,
  optionA,
  optionB
) {
  try {
    console.log("updateBetInBD appelé avec ID:", pariId);

    // Validation robuste de l'ID
    if (
      !pariId ||
      pariId === "undefined" ||
      pariId === "null" ||
      pariId === "NaN"
    ) {
      throw new Error(`ID du pari invalide: "${pariId}"`);
    }

    const betData = {
      title,
      description: description || "",
      deadline: deadlineISO,
      optionA: optionA || "Oui",
      optionB: optionB || "Non",
    };

    console.log("Envoi mise à jour pour ID:", pariId, "Données:", betData);

    const res = await fetch(`/api/paris/${pariId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(betData),
    });

    // Vérifier d'abord si la réponse est OK
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erreur HTTP ${res.status}: ${errorText}`);
    }
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      data = { message: "Mise à jour réussie" };
    }

    // Recharger la liste
    fetchBets();
  } catch (error) {
    alert("Erreur lors de la mise à jour: " + error.message);
  }
}

async function deleteBet(pariId) {
  try {
    const betId = { pariId };
    const res = await fetch(`/api/paris/${pariId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(betId),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erreur HTTP ${res.status}: ${errorText}`);
    }
  } catch (error) {
    alert("Erreur lors de la suppression: " + error.message);
  }
}

async function addVote(choix, pariId) {
  try {
    // Générer un ID utilisateur anonyme unique par navigateur
    if (!window.currentUserId) {
      // Vérifier si on a déjà un ID temporaire dans le localStorage
      let tempUserId = localStorage.getItem("tempUserId");

      if (!tempUserId) {
        // Générer un nouvel ID temporaire unique
        tempUserId =
          "anonymous_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substr(2, 9);
        localStorage.setItem("tempUserId", tempUserId);
      }

      window.currentUserId = tempUserId;
    }

    console.log("Envoi du vote anonyme:", {
      pariId,
      userId: window.currentUserId,
      choix: choix,
    });

    const res = await fetch(`/api/paris/${pariId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: window.currentUserId,
        choix: choix,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 400 && data.message.includes("déjà voté")) {
        alert("Vous avez déjà voté pour ce pari !");
        // Recharger pour mettre à jour l'interface
        fetchBets();
      } else {
        alert(data.message || "Erreur lors du vote");
      }
      return;
    }

    console.log("Vote réussi:", data);

    // Marquer la carte comme votée IMMÉDIATEMENT
    markCardAsVoted(pariId, choix);

    // Message de succès
    showVoteSuccessMessage(pariId);

    // Recharger pour s'assurer que tout est synchronisé
    setTimeout(() => {
      fetchBets();
    }, 1000);
  } catch (err) {
    console.error("Erreur fetch :", err);
    alert("Erreur réseau lors du vote: " + err.message);
  }
}

// Fonction pour marquer une carte comme votée immédiatement
function markCardAsVoted(pariId, choix) {
  const card = document.querySelector(`[data-pari-id="${pariId}"]`);
  if (card) {
    card.classList.add("voted");
    card.dataset.hasVoted = "true";

    // Ajouter le badge "Déjà voté"
    const header = card.querySelector(".bet-header");
    if (header && !header.querySelector(".voted-badge")) {
      const badge = document.createElement("div");
      badge.className = "voted-badge";
      badge.textContent = `✓ Voté: ${choix}`;
      header.appendChild(badge);
    }

    // Désactiver les boutons
    const yesBtn = card.querySelector(".yes");
    const noBtn = card.querySelector(".no");
    if (yesBtn) yesBtn.classList.add("disabled");
    if (noBtn) noBtn.classList.add("disabled");

    // Mettre en évidence le choix de l'utilisateur
    if (choix === yesBtn?.textContent.trim()) {
      yesBtn.classList.add("user-choice");
    } else if (choix === noBtn?.textContent.trim()) {
      noBtn.classList.add("user-choice");
    }
  }
}

// Fonction pour afficher le message de succès
function showVoteSuccessMessage(pariId) {
  const card = document.querySelector(`[data-pari-id="${pariId}"]`);
  if (card) {
    const tempAlert = document.createElement("div");
    tempAlert.textContent = "✓ Vote enregistré !";
    tempAlert.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 14px;
      animation: fadeInOut 2s ease-in-out;
    `;

    if (!document.querySelector("#vote-animation")) {
      const style = document.createElement("style");
      style.id = "vote-animation";
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    card.style.position = "relative";
    card.appendChild(tempAlert);

    setTimeout(() => {
      if (tempAlert.parentNode) {
        tempAlert.parentNode.removeChild(tempAlert);
      }
    }, 2000);
  }
}

async function addBetInBD(
  title,
  description,
  deadlineISO,
  optionA,
  optionB,
  creatorId
) {
  try {
    const betData = {
      title,
      description: description || "",
      deadline: deadlineISO,
      optionA: optionA || "Oui",
      optionB: optionB || "Non",
      creatorId: creatorId,
    };

    console.log("Envoi des données:", betData);

    const res = await fetch("/api/paris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(betData),
    });

    const data = await res.json();
    console.log("Réponse complète du serveur:", data);

    if (!res.ok) {
      console.error("Erreur serveur détaillée:", data);
      alert("Erreur: " + (data.error || "Erreur inconnue"));
      return;
    }

    // Recharger la liste
    fetchBets();
  } catch (error) {
    console.error("Erreur réseau:", error);
    alert("Erreur réseau: " + error.message);
  }
}

// Au chargement initial, s'assurer que le bouton est caché
window.addEventListener("DOMContentLoaded", () => {
  addBetButton.style.display = "none";
});
