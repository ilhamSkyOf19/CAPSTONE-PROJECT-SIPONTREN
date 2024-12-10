
  const menuToggle = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');

    if(menuToggle && menu) {      
      // Tambahkan event listener pada tombol menu
      menuToggle.addEventListener('click', function() {
        if (menu.classList.contains('hidden')) {
          menu.classList.remove('hidden');
          menu.classList.add('block');
        } else {
          menu.classList.remove('block');
          menu.classList.add('hidden');
        }
      });
    }



// scrol horizontal
const container = document.getElementById("scroll-container");

if (container) {
  let isMouseDown = false;
  let startX;
  let scrollLeft;

  // Drag to scroll
  container.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    container.classList.add("cursor-grabbing");
  });

  container.addEventListener("mouseleave", () => {
    isMouseDown = false;
    container.classList.remove("cursor-grabbing");
  });

  container.addEventListener("mouseup", () => {
    isMouseDown = false;
    container.classList.remove("cursor-grabbing");
  });

  container.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 4; // Adjust speed
    container.scrollLeft = scrollLeft - walk;
  });

  // Horizontal scroll with mouse wheel
  container.addEventListener("wheel", (e) => {
    if (e.deltaY) {
      e.preventDefault();
      container.scrollLeft += e.deltaY * 3; // Adjust scroll speed
    }
  });
}

// container ustad
const containerUstad = document.getElementById("scroll-container-ustad");

if (containerUstad) {
  let isMouseDown = false;
  let startX;
  let scrollLeft;

  // Drag to scroll
  containerUstad.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    startX = e.pageX - containerUstad.offsetLeft;
    scrollLeft = containerUstad.scrollLeft;
    containerUstad.classList.add("cursor-grabbing");
  });

  containerUstad.addEventListener("mouseleave", () => {
    isMouseDown = false;
    containerUstad.classList.remove("cursor-grabbing");
  });

  containerUstad.addEventListener("mouseup", () => {
    isMouseDown = false;
    containerUstad.classList.remove("cursor-grabbing");
  });

  containerUstad.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - containerUstad.offsetLeft;
    const walk = (x - startX) * 4; // Adjust speed
    containerUstad.scrollLeft = scrollLeft - walk;
  });

  // Horizontal scroll with mouse wheel
  containerUstad.addEventListener("wheel", (e) => {
    if (e.deltaY) {
      e.preventDefault();
      containerUstad.scrollLeft += e.deltaY * 3; // Adjust scroll speed
    }
  });
}

// container alumni
const containerAlumni = document.getElementById("scroll-container-alumni");

if (containerAlumni) {
  let isMouseDown = false;
  let startX;
  let scrollLeft;

  // Drag to scroll
  containerAlumni.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    startX = e.pageX - containerAlumni.offsetLeft;
    scrollLeft = containerAlumni.scrollLeft;
    containerAlumni.classList.add("cursor-grabbing");
  });

  containerAlumni.addEventListener("mouseleave", () => {
    isMouseDown = false;
    containerAlumni.classList.remove("cursor-grabbing");
  });

  containerAlumni.addEventListener("mouseup", () => {
    isMouseDown = false;
    containerAlumni.classList.remove("cursor-grabbing");
  });

  containerAlumni.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - containerAlumni.offsetLeft;
    const walk = (x - startX) * 4; // Adjust speed
    containerAlumni.scrollLeft = scrollLeft - walk;
  });

  // Horizontal scroll with mouse wheel
  containerAlumni.addEventListener("wheel", (e) => {
    if (e.deltaY) {
      e.preventDefault();
      containerAlumni.scrollLeft += e.deltaY * 3; // Adjust scroll speed
    }
  });
}

// berita horizontal scrol
const containerBerita = document.getElementById("scroll-container-berita");

if (containerBerita) {
  let isMouseDown = false;
  let startX;
  let scrollLeft;

  // Drag to scroll
  containerBerita.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    startX = e.pageX - containerBerita.offsetLeft;
    scrollLeft = containerBerita.scrollLeft;
    containerBerita.classList.add("cursor-grabbing");
  });

  containerBerita.addEventListener("mouseleave", () => {
    isMouseDown = false;
    containerBerita.classList.remove("cursor-grabbing");
  });

  containerBerita.addEventListener("mouseup", () => {
    isMouseDown = false;
    containerBerita.classList.remove("cursor-grabbing");
  });

  containerBerita.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - containerBerita.offsetLeft;
    const walk = (x - startX) * 4; // Adjust speed
    containerBerita.scrollLeft = scrollLeft - walk;
  });

  // Horizontal scroll with mouse wheel
  containerBerita.addEventListener("wheel", (e) => {
    if (e.deltaY) {
      e.preventDefault();
      containerBerita.scrollLeft += e.deltaY * 3; // Adjust scroll speed
    }
  });
}

// tujuan higlight 
  const tujuan = ['tujuan-1.jpg', 'tujuan-2.jpg', 'tujuan-3.jpg', 'tujuan-4.jpg'];

  // Ambil semua elemen grid
  const gridItems = [
    document.getElementById('grid-item-1'),
    document.getElementById('grid-item-2'),
    document.getElementById('grid-item-3'),
  ];

  const duration = 500; // Durasi transisi (ms)
  const updateInterval = 3000; // Interval pergantian gambar (ms)

// Fungsi untuk memperbarui gambar
if (gridItems) {
  const updateImage = (item, index) => {
    if (!item) return;

    let currentIndex = index % tujuan.length; // Hitung index gambar saat ini
    const innerDiv = item.querySelector('div');

    if (!innerDiv) return;

    // Fade-out
    innerDiv.classList.remove('opacity-100');
    innerDiv.classList.add('opacity-0');

    setTimeout(() => {
      // Ganti gambar setelah fade-out selesai
      innerDiv.style.backgroundImage = `url('/public/asset/${tujuan[currentIndex]}')`;

      // Fade-in
      innerDiv.classList.remove('opacity-0');
      innerDiv.classList.add('opacity-100');
    }, duration);
  };

  // Set interval untuk setiap elemen dengan delay
  gridItems.forEach((item, index) => {
    let currentIndex = index;

    setInterval(() => {
      updateImage(item, currentIndex);
      currentIndex = (currentIndex + 1) % tujuan.length;
    }, updateInterval + index * 1000); // Tambahkan delay berbeda untuk setiap elemen
  });
}






// highlight berita

document.addEventListener("DOMContentLoaded", function () {
  const beritaItems = document.querySelectorAll(".berita-item");
  let currentIndex = 0;

  if (beritaItems.length > 0) {
    function showNextBerita() {
      // Elemen saat ini: sembunyikan dan ubah z-index
      beritaItems[currentIndex].classList.remove("opacity-100", "z-10");
      beritaItems[currentIndex].classList.add("opacity-0", "z-0");

      // Pindah ke elemen berikutnya
      currentIndex = (currentIndex + 1) % beritaItems.length;

      // Elemen berikutnya: tampilkan dan ubah z-index
      beritaItems[currentIndex].classList.remove("opacity-0", "z-0");
      beritaItems[currentIndex].classList.add("opacity-100", "z-10");
    }

    // Atur elemen pertama sebagai aktif
    beritaItems[currentIndex].classList.add("opacity-100", "z-10");

    // Ganti elemen setiap 3 detik
    setInterval(showNextBerita, 3000);
  }
});



// history 
const path = window.location.pathname; // Contoh: "/detail-berita/30/sejarah"
const breadcrumbContainer = document.getElementById('breadcrumb');

if (breadcrumbContainer) {
  // Mapping nama segmen untuk menampilkan nama yang lebih ramah pengguna
  const segmentDisplayNames = {
    'detail-berita': 'Detail Berita',
    'profile': 'Profile',
    'sejarah': 'Sejarah',
    'visi-misi': 'Visi & Misi',
    'home': 'Home',
  };

  // Pisahkan URL menjadi segmen
  const segments = path.split('/').filter(Boolean);

  // Tambahkan "Home" sebagai awal breadcrumb
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';
  homeLink.classList.add( 'hover:underline');
  breadcrumbContainer.appendChild(homeLink);

  // Tambahkan separator untuk breadcrumb pertama
  const separator = document.createElement('span');
  separator.textContent = ' › ';
  separator.classList.add('text-gray-400');
  breadcrumbContainer.appendChild(separator);

  let basePath = '';
  // Buat navigasi breadcrumb dinamis berdasarkan URL path
  segments.forEach((segment, index) => {
    basePath += `/${segment}`;

    const link = document.createElement('a');
    
    // Kondisi khusus: Jika segmen adalah 'profile', maka router-nya harus mengarah ke '/'
    if (segment === 'profile') {
      link.href = '/';
    } else {
      link.href = basePath;
    }

    link.textContent = segmentDisplayNames[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    link.classList.add('hover:underline');

    breadcrumbContainer.appendChild(link);

    // Tambahkan separator jika bukan segmen terakhir
    if (index < segments.length - 1) {
      const nextSeparator = document.createElement('span');
      nextSeparator.textContent = ' › ';
      nextSeparator.classList.add('text-gray-400');
      breadcrumbContainer.appendChild(nextSeparator);
    }
  });
}



// navbar 

