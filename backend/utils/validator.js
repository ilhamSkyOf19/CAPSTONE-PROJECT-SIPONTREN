import { check } from "express-validator";
import { fileURLToPath } from 'node:url';
import fs from 'fs';
import path from 'path';
import Berita from '../models/skemaBerita.js';
import Pendaftaran from "../models/pendaftaran.js";


// path untuk dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// validator input
export const validatorResult = [
    check('nisn', 'nisn harus berisi angka!').isNumeric({ no_symbols: true }),  // cek nisn
    check('nik', 'nik harus berisi angka!').isNumeric({ no_symbols: true }),    // cek nik
    check('nama_lengkap', 'nama harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }),    // cek nama_lengkap
    check('usia')   // cek usia
        .notEmpty().withMessage('Usia harus diisi!') // Pastikan usia tidak kosong
        .bail() // Berhenti jika ada error sebelumnya
        .isInt({ max: 30 }).withMessage('Usia harus berupa angka dan maksimal 30!')
        .bail() // Berhenti jika ada error sebelumnya
        .custom(value => {
            if (value < 1) {
                throw new Error('Usia harus lebih dari 0!');
            }
            return true; // Validasi berhasil
        }),
    check('tempat_lahir', 'tempat harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }), // cek tempat lahir
    check('tanggal_lahir', 'tanggal lahir tidak valid').isDate(),  // cek tanggal lahir
    check('anak_ke')    // cek berat badan
    .notEmpty().withMessage('anak ke harus diisi!')
    .bail()
    .isInt().withMessage('anak ke tidak valid!')
    .bail()
    .isLength({max : 2}).withMessage('anak ke tidak valid!')
    .bail()
    .custom(value => {
        if (value < 1) {
            throw new Error('anak ke tidak valid');
        }
        return true; // Validasi berhasil
    }),
    check('jumlah_saudara')       // cek tinggi badan
    .notEmpty().withMessage('jumlah saudara tidak valid!')
    .bail()
    .isInt().withMessage('jumlah saudara tidak valid!')
    .bail()
    .isLength({max : 2}).withMessage('jumlah saudara tidak valid!')
    .bail()
    .custom(value => {
        if (value < 1) {
            throw new Error('jumlah sudara tidak valid');
        }
        return true; // Validasi berhasil
    }),
    check('nomor_telephone')    // cek nomor telephone
        .isMobilePhone('id-ID').withMessage('yang ada masukan bukan nomor telephone indonesia')
        .bail()
        .notEmpty().withMessage('nomor telephone harus diisi!')
        .bail()
        .isInt().withMessage('nomor telephone harus berupa angka')
        .bail()
        .isLength({max: 13}).withMessage('nomor telephone tidak boleh lebih dari 13 digit!')
        .bail()
        .custom(value => {
        if (value < 1) {
            throw new Error('nomor telephone harus lebih dari 0!');
        }
        return true; // Validasi berhasil
        }),
    check('alumni_sd', 'alumni sd tidak valid!').matches(/^[a-zA-Z0-9 ]+$/), // cek alumni sd
    check('alamat_sekolah_asal', 'Alamat sekolah asal tidak valid!')
    .matches(/^[a-zA-Z, ]*$/), // Hanya huruf, spasi, dan simbol ','
    check('nama_lengkap_ayah', 'nama lengkap ayah tidak valid!').isAlpha('en-US', { ignore: ' ' }),    // cek nama_lengkap
    check('nama_lengkap_ibu', 'nama lengkap ibu tidak valid!').isAlpha('en-US', { ignore: ' ' }),    // cek nama_lengkap
    check('nama_lengkap_wali', 'nama lengkap wali tidak valid!').isAlpha('en-US', { ignore: ' ' }),    // cek nama_lengkap
    check('kode_pos')   // cek kode pos
        .notEmpty().withMessage('kode pos harus diisi!')
        .bail()
        .isNumeric({ no_symbols: true }).withMessage('kode pos harus berupa angka')
        .bail()
        .isLength({max : 5}).withMessage('kode pos tidak boleh lebih dari 5 digit!')
        .bail()
        .custom(value => {
            if (value < 1) {
                throw new Error('kode pos harus lebih dari 0!');
            }
            return true; // Validasi berhasil
        }),
    
];


// capitalize teks
export function capitalizeWords(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};


// delete berita 
export async function deleteBeritaById(id) {
    try {
        // Temukan data berita berdasarkan ID
        const berita = await Berita.findById(id);

        // Jika berita ditemukan
        if (!berita) {
            return { success: false, message: 'Data tidak ditemukan!' };
        }

        // Path direktori image (today adalah tanggal dari dokumen berita)
        const today = berita.date.toISOString().split('T')[0]; // Mengambil tanggal dari date dan menghilangkan 'T'
        const filePath = path.join(process.cwd(), 'public', 'imageBerita', today, berita.thumbnail); // Menyusun path gambar

        // Cek apakah file gambar ada dan hapus
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Menggunakan unlinkSync untuk menunggu proses penghapusan selesai
            console.log('Gambar berhasil dihapus:', filePath);
        } else {
            console.log('File gambar tidak ditemukan:', filePath);
        }

        // Hapus data berita dari MongoDB
        await Berita.deleteOne({ _id: id });
        return { success: true, message: 'Data dan gambar berhasil dihapus!' };
        
    } catch (error) {
        console.error('Error saat menghapus berita:', error);
        return { success: false, message: 'Gagal menghapus data!' };
    }
}



// delete data pendaftar
export async function deletePendaftarById(id) {
    try {
        // Temukan data pendaftar berdasarkan ID
        const pendaftar = await Pendaftaran.findById(id);

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

        // Hapus data pendaftar dari MongoDB
        await Pendaftaran.deleteOne({ _id: id });
        return { success: true, message: 'Data pendaftar, gambar, dan folder berhasil dihapus!' };

    } catch (error) {
        console.error('Error saat menghapus data pendaftar:', error);
        return { success: false, message: 'Gagal menghapus data!' };
    }
}
