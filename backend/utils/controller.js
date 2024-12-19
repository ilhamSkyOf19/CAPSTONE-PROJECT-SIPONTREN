import fs from 'fs';
import path from 'path';
import Berita from '../models/skemaBerita.js';
import Pendaftaran from "../models/pendaftaran.js";
import Alumni from '../models/skemaAlumni.js';
import Ustad from '../models/skemaUstad.js';

// capitalize teks
export function capitalizeWords(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};


// delete berita 
export async function deleteBeritaById(id) {
    try {
        // Query untuk mendapatkan data berita berdasarkan ID
        const berita = await Berita.findByPk(id);  // Menggunakan Sequelize untuk mencari berdasarkan PK (id)

        if (!berita) {
            return { success: false, message: 'Data tidak ditemukan!' };
        }

        // Path direktori image (tanggal hari ini dari berita)
        const today = new Date(berita.date).toISOString().split('T')[0]; // Ambil tanggal dan hilangkan 'T'
        const filePath = path.join(process.cwd(), 'public', 'imageBerita', today, berita.thumbnail); // Susun path gambar

        // Cek apakah file gambar ada dan hapus
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Hapus gambar
            console.log('Gambar berhasil dihapus:', filePath);
        } else {
            console.log('File gambar tidak ditemukan:', filePath);
        }

        // Hapus data berita dari MySQL menggunakan Sequelize
        await berita.destroy(); // Menggunakan method destroy() dari Sequelize untuk menghapus data

        return { success: true, message: 'Data dan gambar berhasil dihapus!' };

    } catch (error) {
        console.error('Error saat menghapus berita:', error);
        return { success: false, message: 'Gagal menghapus data!' };
    }
}



// delete data pendaftar
// Fungsi untuk menghapus pendaftar berdasarkan ID
export async function deletePendaftarById(id) {
    try {
        // Cari data pendaftar berdasarkan ID menggunakan Sequelize
        const pendaftar = await Pendaftaran.findOne({ where: { id } });

        // Jika pendaftar tidak ditemukan
        if (!pendaftar) {
            return { success: false, message: 'Data pendaftar tidak ditemukan!' };
        }

        // Path direktori folder berdasarkan NIK
        const nikFolder = path.join(process.cwd(), 'public', 'imagesPendaftar', pendaftar.nik);

        // Menghapus setiap file gambar di dalam folder NIK
        if (fs.existsSync(nikFolder)) {
            fs.readdirSync(nikFolder).forEach((file) => {
                const filePath = path.join(nikFolder, file);
                fs.unlinkSync(filePath);
                console.log('Gambar berhasil dihapus:', filePath);
            });

            // Hapus folder setelah semua file di dalamnya terhapus
            fs.rmdirSync(nikFolder);
            console.log('Folder berhasil dihapus:', nikFolder);
        } else {
            console.log('Folder tidak ditemukan:', nikFolder);
        }

        // Hapus data pendaftar dari MySQL
        await Pendaftaran.destroy({ where: { id } });

        return { success: true, message: 'Data pendaftar, gambar, dan folder berhasil dihapus!' };

    } catch (error) {
        console.error('Error saat menghapus data pendaftar:', error);
        return { success: false, message: 'Gagal menghapus data!' };
    }
}


// delete data alumni
export async function deleteAlumniById(id) {
    try {
        // Query untuk mendapatkan data alumni berdasarkan ID
        const alumni = await Alumni.findByPk(id); // Menggunakan Sequelize untuk mencari berdasarkan PK (id)

        if (!alumni) {
            return { success: false, message: 'Alumni tidak ditemukan!' };
        }

        // Path direktori image (tanggal hari ini dari alumni)
        const imgAlumniPath = path.join(process.cwd(), 'public', 'imagesAlumni', alumni.imgAlumni); // Susun path gambar

        // Cek apakah file gambar ada dan hapus
        if (fs.existsSync(imgAlumniPath)) {
            fs.unlinkSync(imgAlumniPath); // Hapus gambar
            console.log('Gambar alumni berhasil dihapus:', imgAlumniPath);
        } else {
            console.log('File gambar alumni tidak ditemukan:', imgAlumniPath);
        }

        // Hapus data alumni dari MySQL menggunakan Sequelize
        await alumni.destroy(); // Menggunakan method destroy() dari Sequelize untuk menghapus data

        return { success: true, message: 'Data alumni dan gambar berhasil dihapus!' };

    } catch (error) {
        console.error('Error saat menghapus alumni:', error);
        return { success: false, message: 'Gagal menghapus data alumni!' };
    }
}


// delete data ustad dan ustadzah
export async function deleteUstadUstadzahById(id) {
    try {
        // Query untuk mendapatkan data alumni berdasarkan ID
        const ustadUstadzah = await Ustad.findByPk(id); // Menggunakan Sequelize untuk mencari berdasarkan PK (id)

        if (!ustadUstadzah) {
            return { success: false, message: 'Ustad / Ustadzah tidak ditemukan!' };
        }

        // Path direktori image (tanggal hari ini dari alumni)
        const imgUstadUstadzahPath = path.join(process.cwd(), 'public', 'imagesUstadUstadzah', ustadUstadzah.img_ustad_ustadzah); // Susun path gambar

        // Cek apakah file gambar ada dan hapus
        if (fs.existsSync(imgUstadUstadzahPath)) {
            fs.unlinkSync(imgUstadUstadzahPath); // Hapus gambar
            console.log('Gambar ustad / ustadzah berhasil dihapus:', imgUstadUstadzahPath);
        } else {
            console.log('File gambar ustad / ustadzah tidak ditemukan:', imgUstadUstadzahPath);
        }

        // Hapus data alumni dari MySQL menggunakan Sequelize
        await ustadUstadzah.destroy(); // Menggunakan method destroy() dari Sequelize untuk menghapus data

        return { success: true, message: 'Data Ustad / Ustadzah dan gambar berhasil dihapus!' };

    } catch (error) {
        console.error('Error saat menghapus data:', error);
        return { success: false, message: 'Gagal menghapus data' };
    }
}
