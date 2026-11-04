/**
 * Mobile Navigation Hamburger Menu Toggle for Roman Thermae of Odessos
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure logo is always displayed to the left of the brand link
  const brand = document.querySelector('.brand');
  if (brand && !brand.querySelector('.brand-logo')) {
    const img = document.createElement('img');
    img.src = 'https://cdn.jsdelivr.net/gh/EduHack-Plovdiv-Ekip404/EduHack--otboe-33.-Ekip404---Odesos-Rimski-Termi/assets/aistudio/emblem_transparent_c3ec1952.png';
    img.onerror = function () {
      this.onerror = null;
      this.src = 'assets/aistudio/emblem_transparent_c3ec1952.png';
    };
    img.alt = 'Екип 404 - Одесос';
    img.className = 'brand-logo';
    brand.prepend(img);
  }

  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.innerHTML = isOpen ? '✕' : '☰';
  });

  // Close when clicking a link inside mobile menu
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = '☰';
    });
  });

  // Close when clicking outside navbar
  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav')) {
      navLinks.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = '☰';
    }
  });
});
