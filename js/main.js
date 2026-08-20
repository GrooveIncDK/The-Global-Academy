const menuBtn = document.getElementById('menuBtn');
const primaryNav = document.querySelector('nav.primary');

menuBtn.addEventListener('click', () => {
  const isOpen = primaryNav.style.display === 'flex';
  primaryNav.style.display = isOpen ? 'none' : 'flex';
  primaryNav.style.flexDirection = 'column';
  primaryNav.style.width = '100%';
});
