// const addBetButton = document.querySelector(".add-bet");
// const betGrid = document.querySelector(".bet-grid");

// ###################################################
// OVERLAY FORMULAIRE AJOUT PARI
// ###################################################

// const overlay = document.createElement("div");
// overlay.classList.add("overlay");

// overlay.innerHTML = `
//     <div class="overlay-content">
//         <h2>Ajouter un nouveau pari</h2>
//         <input type="text" placeholder="Nom du pari" />
//         <textarea placeholder="Description du pari"></textarea>
//         <label>Options de pari : (facultatif)</label>
//         <input class="persoOui" type="text" placeholder="oui" />
//         <input class="persoNon" type="text" placeholder="non"/>
//         <input type="date" />
//         <input type="time" />
//         <div class="overlay-options">
//             <button class="submit-bet">Soumettre le pari</button>
//             <button class="close-overlay">Fermer</button>
//         </div>
//     </div>
// `;

// addBetButton.addEventListener("click", () => {
//   overlay.style.display = "flex";
//   if (!document.body.contains(overlay)) document.body.appendChild(overlay);
// });

// const closeOverlayButton = overlay.querySelector(".close-overlay");
// closeOverlayButton.addEventListener("click", () => {
//   overlay.style.display = "none";
// });

// const submitBetButton = overlay.querySelector(".submit-bet");

// submitBetButton.addEventListener("click", async () => {
//   const titleInput = overlay.querySelector('input[type="text"]');
//   const descriptionInput = overlay.querySelector("textarea");
//   const dateInput = overlay.querySelector('input[type="date"]');
//   const timeInput = overlay.querySelector('input[type="time"]');
//   const ouiInput = overlay.querySelector(".persoOui").value || "oui";
//   const nonInput = overlay.querySelector(".persoNon").value || "non";

//   const deadline = new Date(`${dateInput.value}T${timeInput.value}`);

// });

// ###################################################

// const newBetCard = document.createElement("div");
//   newBetCard.classList.add("bet-card");
//   newBetCard.innerHTML = `
//         <div class="bet-header">
//             <h2>${pari.titre}</h2>
//             <p class="bet-date"><span class="days-left">${daysLeftText}</span></p>
//         </div>
//         <p>${pari.description || ""}</p>
//         <div class="bet-options">
//             <button class="yes">${ouiInput}</button>
//             <div class="vote-center">
//                 <div class="slide-bar">
//                     <div class="green"></div>
//                     <div class="red"></div>
//                 </div>
//                 <div class="pct-text"><span class="pct-oui">50%</span> / <span class="pct-non">50%</span></div>
//             </div>
//             <button class="no">${nonInput}</button>
//         </div>
//     `;

//   betGrid.appendChild(newBetCard);




// ###################################################
// TEST AFFICHAGE BDD
// ###################################################

async function fetchBets() {
  try {
    const result = await fetch("/api/paris");
    const paris = await result.json();
    console.log(paris);
  } catch (err) {
    console.error("Erreur lors du fetch /api/allParis :", err);
  }
}

// Call fetchBets once the DOM is ready
window.addEventListener("DOMContentLoaded", fetchBets);