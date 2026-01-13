function initPasswordToggles() {
  const toggles = document.querySelectorAll(".password-toggle");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetId = toggle.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const icon = toggle.querySelector(".eye-icon");

      if (input && icon) {
        // Basculer le type d'input
        const newType = input.type === "password" ? "text" : "password";
        input.type = newType;

        // Basculer l'icône avec animation
        if (newType === "text") {
          // Animation pour montrer le mot de passe
          icon.classList.remove("hidden");
          icon.classList.add("visible");
          toggle.classList.add("visible");

          // Animation de clignotement
          icon.style.animation = "eyeBlink 0.5s ease";
          setTimeout(() => {
            icon.style.animation = "";
          }, 500);
        } else {
          // Animation pour cacher le mot de passe
          icon.classList.remove("visible");
          icon.classList.add("hidden");
          toggle.classList.remove("visible");
        }
      }
    });
  });
}

// Initialiser les toggles au chargement
document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();

  const form = document.querySelector(".auth-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const errorMsg = document.getElementById("errorMsg");

      if (!email || !password) {
        console.error("Champs manquants");
        return;
      }

      const emailValue = email.value;
      const passwordValue = password.value;

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue, password: passwordValue }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Afficher l'erreur de manière sécurisée
          if (errorMsg) {
            errorMsg.textContent = data.error || "Erreur de connexion";
            errorMsg.style.display = "block";
            errorMsg.style.color = "red";
          } else {
            alert(data.error || "Erreur de connexion");
          }
          return;
        }

        // Cacher l'erreur si elle existe
        if (errorMsg) {
          errorMsg.style.display = "none";
        }

        localStorage.setItem("token", data.token);
        window.location.href = "../index.html";
      } catch (err) {
        // Afficher l'erreur de manière sécurisée
        if (errorMsg) {
          errorMsg.textContent = "Erreur réseau ou serveur";
          errorMsg.style.display = "block";
          errorMsg.style.color = "red";
        } else {
          alert("Erreur réseau ou serveur");
        }
        console.error(err);
      }
    });
  }
});
