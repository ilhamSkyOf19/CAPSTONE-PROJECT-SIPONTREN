// Ambil elemen
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu');

// Periksa apakah elemen menuBtn ada
if (menuBtn && menu) {
  // Navbar toggle ketika tombol diklik
  menuBtn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
  });

  // Tutup menu jika klik di luar area menu
  document.addEventListener('click', (e) => {
    // Periksa apakah klik tidak berasal dari menu atau tombol
    if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
} else {
  // Tangani kasus di mana elemen tidak ditemukan
  console.error('Error: menu-btn atau menu tidak ditemukan di DOM.');
}