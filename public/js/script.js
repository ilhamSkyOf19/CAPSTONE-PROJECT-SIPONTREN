const deleteForm = document.getElementById('delete');
const deleteButton = document.getElementById('submitBtn');

deleteButton.addEventListener('click', function (event) {
    event.preventDefault(); // Mencegah form langsung dikirim

    // Menampilkan pesan konfirmasi kepada user
    const confirmation = confirm('Apakah Anda yakin ingin menghapus data ini?');

    // Jika user memilih "OK", lanjutkan pengiriman form
    if (confirmation) {
        deleteForm.submit();
    }
});