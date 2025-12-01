// Gestion du menu mobile
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const body = document.body;

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", function (e) {
      e.stopPropagation();
      this.classList.toggle("active");
      mobileMenu.classList.toggle("active");

      if (mobileMenu.classList.contains("active")) {
        body.style.overflow = "hidden";
      } else {
        body.style.overflow = "";
      }
    });

    // Fermer le menu en cliquant sur les liens
    const mobileLinks = mobileMenu.querySelectorAll("a, button");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.stopPropagation();
        hamburger.classList.remove("active");
        mobileMenu.classList.remove("active");
        body.style.overflow = "";
      });
    });

    // Fermer le menu en cliquant à l'extérieur
    document.addEventListener("click", function (e) {
      if (
        mobileMenu.classList.contains("active") &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        hamburger.classList.remove("active");
        mobileMenu.classList.remove("active");
        body.style.overflow = "";
      }
    });

    // Empêcher la propagation dans le menu
    mobileMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  // Gestion de la barre de recherche desktop
  const searchInput = document.querySelector(".search-input");
  const searchSuggestions = document.querySelector(".search-suggestions");
  const searchButton = document.querySelector(".search-button");

  if (searchInput && searchSuggestions) {
    searchInput.addEventListener("focus", function () {
      searchSuggestions.classList.add("active");
    });

    // Cacher les suggestions en cliquant à l'extérieur
    document.addEventListener("click", function (e) {
      if (
        !searchInput.contains(e.target) &&
        !searchSuggestions.contains(e.target)
      ) {
        searchSuggestions.classList.remove("active");
      }
    });

    // Recherche
    searchButton.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performSearch();
      }
    });

    // Suggestions
    const suggestionTags = searchSuggestions.querySelectorAll(
      ".suggestion-tag, .recent-search"
    );
    suggestionTags.forEach((tag) => {
      tag.addEventListener("click", function () {
        searchInput.value = this.textContent;
        performSearch();
        searchSuggestions.classList.remove("active");
      });
    });
  }

  // Gestion de la barre de recherche mobile
  const mobileSearchInput = document.querySelector(".mobile-search-input");
  const mobileSearchButton = document.querySelector(".mobile-search-button");

  if (mobileSearchInput && mobileSearchButton) {
    mobileSearchButton.addEventListener("click", performMobileSearch);
    mobileSearchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performMobileSearch();
      }
    });
  }

  function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
      alert(`Recherche: ${query}`);
    }
  }

  function performMobileSearch() {
    const query = mobileSearchInput.value.trim();
    if (query) {
      // Fermer le menu mobile après recherche
      const hamburger = document.querySelector(".hamburger");
      const mobileMenu = document.querySelector(".mobile-menu");
      if (hamburger && mobileMenu) {
        hamburger.classList.remove("active");
        mobileMenu.classList.remove("active");
        document.body.style.overflow = "";
      }
      // Implémentez votre logique de recherche ici
      alert(`Recherche: ${query}`);
    }
  }
});
