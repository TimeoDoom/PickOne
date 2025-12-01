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