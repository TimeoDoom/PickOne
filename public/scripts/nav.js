// scripts/nav.js
console.log('Navigation script loaded!');

// Gestion du menu mobile
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded!');
  
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const body = document.body;
  
  console.log('Hamburger element:', hamburger);
  console.log('Mobile menu element:', mobileMenu);
  
  if (hamburger && mobileMenu) {
    console.log('Both elements found, adding event listeners...');
    
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log('Hamburger clicked!');
      this.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      
      if (mobileMenu.classList.contains('active')) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    });
    
    // Fermer le menu en cliquant sur les liens
    const mobileLinks = mobileMenu.querySelectorAll('a, button');
    mobileLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Mobile link clicked, closing menu');
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        body.style.overflow = '';
      });
    });
    
    // Fermer le menu en cliquant à l'extérieur
    document.addEventListener('click', function(e) {
      if (mobileMenu.classList.contains('active') && 
          !mobileMenu.contains(e.target) && 
          !hamburger.contains(e.target)) {
        console.log('Click outside, closing menu');
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        body.style.overflow = '';
      }
    });
    
    // Empêcher la propagation dans le menu
    mobileMenu.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
  } else {
    console.error('Required elements not found!');
    if (!hamburger) console.error('Hamburger button not found');
    if (!mobileMenu) console.error('Mobile menu not found');
  }
  
  // Gestion de la barre de recherche desktop
  const searchInput = document.querySelector('.search-input');
  const searchSuggestions = document.querySelector('.search-suggestions');
  const searchButton = document.querySelector('.search-button');

  if (searchInput && searchSuggestions) {
    console.log('Search elements found');
    
    searchInput.addEventListener('focus', function() {
      console.log('Search input focused');
      searchSuggestions.classList.add('active');
    });

    // Cacher les suggestions en cliquant à l'extérieur
    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.remove('active');
      }
    });

    // Recherche
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Suggestions
    const suggestionTags = searchSuggestions.querySelectorAll('.suggestion-tag, .recent-search');
    suggestionTags.forEach(tag => {
      tag.addEventListener('click', function() {
        searchInput.value = this.textContent;
        performSearch();
        searchSuggestions.classList.remove('active');
      });
    });
  }

  // Gestion de la barre de recherche mobile
  const mobileSearchInput = document.querySelector('.mobile-search-input');
  const mobileSearchButton = document.querySelector('.mobile-search-button');

  if (mobileSearchInput && mobileSearchButton) {
    mobileSearchButton.addEventListener('click', performMobileSearch);
    mobileSearchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performMobileSearch();
      }
    });
  }

  function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
      console.log('Desktop search:', query);
      // Implémentez votre logique de recherche ici
      alert(`Recherche: ${query}`);
    }
  }

  function performMobileSearch() {
    const query = mobileSearchInput.value.trim();
    if (query) {
      console.log('Mobile search:', query);
      // Fermer le menu mobile après recherche
      const hamburger = document.querySelector('.hamburger');
      const mobileMenu = document.querySelector('.mobile-menu');
      if (hamburger && mobileMenu) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
      // Implémentez votre logique de recherche ici
      alert(`Recherche: ${query}`);
    }
  }
  
  // Debug: Vérifier la taille de l'écran
  console.log('Window width:', window.innerWidth);
  console.log('Hamburger display style:', window.getComputedStyle(hamburger).display);
});