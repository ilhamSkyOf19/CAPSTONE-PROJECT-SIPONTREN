// document.getElementById('MyForm').addEventListener('submit', function(event) {
//     // Reset form setelah submit
//     this.reset();
// });
const submitBtn = document.getElementById('submitBtn');
        
// Tambahkan event listener untuk klik pada tombol submit
submitBtn.addEventListener('click', function(event) {
    // Tampilkan kotak konfirmasi
    const confirmation = confirm("Apakah Anda yakin ingin menghapus data ini cuy?");
    
    // Jika pengguna menekan "Cancel", cegah pengiriman form
    if (!confirmation) {
        event.preventDefault();
    }
});
