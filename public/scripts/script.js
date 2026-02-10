const addBetButtons = document.querySelectorAll(".add-bet");
const accountButtons = document.querySelectorAll(".account-btn");

(async () => {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) {
    addBetButtons.forEach((btn) => {
      btn.textContent = "Se connecter";
      btn.addEventListener("click", () => {
        window.location.href = "../login.html";
      });
    });

    accountButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = "../login.html";
      });
    });
  } else {
    const user = await res.json();

    addBetButtons.forEach((btn) => {
      btn.textContent = "Nouveau";
      btn.addEventListener("click", () => {
        console.log("ouverture création");
      });
    });

    accountButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = "../account.html";
      });
    });
  }
})();


// Wallet display
// const walletElem = document.getElementById("wallet");

// async function updateWallet() {
//   try {
//     const res = await fetch("/api/auth/me", {
//       credentials: "include",
//     });

//     if (res.ok) {
//       const user = await res.json();
//       const balance = user.wallet_balance || 0;
//       walletElem.textContent = `${balance.toFixed(2)} pickCoin`;
//     } else {
//       walletElem.textContent = "0.00 pickCoin";
//     }
//   } catch (err) {
//     console.error("Erreur lors de la récupération du solde du portefeuille:", err);
//     walletElem.textContent = "0.00 pickCoin";
//   }
// }

// updateWallet();

// Optionally, refresh wallet balance every 5 minutes
// setInterval(updateWallet, 5 * 60 * 1000);