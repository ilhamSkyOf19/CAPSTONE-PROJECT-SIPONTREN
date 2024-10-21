import { fileTypeFromBuffer } from 'file-type';
import { readChunk } from 'read-chunk';
import { unlink, access } from 'node:fs/promises';
import fs from 'fs/promises';
import { Pendaftaran } from '../models/pendaftaran.js';

async function checkFile(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        return false;
    }
}

class FileValidator {
    // Method untuk memeriksa tipe file
    async checkFileType(req, res, next, fileLocation) {
        try {
            // Ambil semua file dari request
            const uploadedFiles = req.files; // Ini adalah objek berisi semua file yang di-upload
            const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg']; // Tipe MIME yang valid
            const filesToCheck = [];
    
            // Iterasi melalui semua file yang di-upload
            for (const [key, files] of Object.entries(uploadedFiles)) {
                // Ambil file pertama dari array file (jika ada)
                const file = files[0];
                if (file) {
                    filesToCheck.push(file); // Tambahkan file ke daftar untuk diperiksa
                }
            }
    
            // Membaca chunk awal dari file untuk memeriksa tipe file
            for (const file of filesToCheck) {
                const buffer = await readChunk(file.path, { length: 4100 });
                const fileType = await fileTypeFromBuffer(buffer);
    
                // Validasi tipe file
                if (!(fileType && validMimeTypes.includes(fileType.mime))) {
                    // Jika file tidak valid, hapus semua file yang ada
                    await Promise.all(filesToCheck.map(async (f) => {
                        const isExistFile = await checkFile(f.path);
                        if (isExistFile) {
                            await unlink(f.path); // Hapus file yang valid sebelumnya
                        }
                    }));
    
                    // Buat error custom dengan kode
                    await fs.rmdir(`images/${req.body.nik}`); // Hapus folder berdasarkan nik
                    const error = new Error('File tidak valid, harus berupa .jpg, .jpeg, atau .png');
                    error.code = 'INVALID_FILE_TYPE';
                    return res.render(fileLocation, {
                        layout: 'layouts/main-ejs-layouts',
                        title: 'Form',
                        errors: [{ msg: error.message }],
                        data: req.body, // Menyimpan input sebelumnya
                    });
                }
            }
    
            // Jika semua file valid, lanjutkan ke middleware berikutnya
            return next();
        } catch (error) {
            // Jika ada kesalahan di luar validasi file
            const generalError = new Error('Terjadi kesalahan saat memeriksa file.');
            generalError.code = 'FILE_CHECK_ERROR';
            return next(generalError);
        }
    }    
    async checkFileType2(req, res, next, fileLocation) {
        let dataPendaftar = await Pendaftaran.findById(req.body._id);
        try {
            // Cek apakah file ada dalam request
            // Cek apakah file ada dalam request
            const fotoFormal = req.files['foto_formal'] ? req.files['foto_formal'][0] : null;
            const aktaKelahiran = req.files['akta_kelahiran'] ? req.files['akta_kelahiran'][0] : null;
            const kartuKeluarga = req.files['kartu_keluarga'] ? req.files['kartu_keluarga'][0] : null;
            const fcKtp = req.files['fc_ktp'] ? req.files['fc_ktp'][0] : null;
            const kipKis = req.files['kip_kis'] ? req.files['kip_kis'][0] : null;

            // Membaca chunk awal dari file untuk memeriksa tipe file
            const filesToCheck = [fotoFormal, aktaKelahiran, kartuKeluarga, fcKtp, kipKis].filter(Boolean); // Hanya ambil file yang ada
            for (const file of filesToCheck) {
                const buffer = await readChunk(file.path, { length: 4100 });
                const fileType = await fileTypeFromBuffer(buffer);

                // Validasi tipe file
                if (!(fileType && (fileType.mime === 'image/jpeg' || fileType.mime === 'image/png' || fileType.mime === 'image/jpg'))) {
                    // Jika file tidak valid, hapus semua file yang ada
                    await Promise.all(filesToCheck.map(async (f) => {
                        const isExistFile = await checkFile(f.path);
                        if (isExistFile) {
                            await unlink(f.path); // Hapus file yang valid sebelumnya
                        }
                    }));
                    
                    // Buat error custom dengan kode
                    // await fs.rmdir(`images/${req.body.nik}`); // Hapus folder berdasarkan nik
                    const error = new Error('File tidak valid, harus berupa .jpg, .jpeg, atau .png');
                    error.code = 'INVALID_FILE_TYPE';
                    return res.render(fileLocation, {
                        layout: 'layouts/main-ejs-layouts',
                        title: 'Form',
                        errors: [{ msg: error.message }],
                        data: req.body, // Menyimpan input sebelumnya
                        dataFile: dataPendaftar,
                    });
                }
            }

            // Jika semua file valid, lanjutkan ke middleware berikutnya
            return next();
        } catch (error) {
            // Jika ada kesalahan di luar validasi file
            const generalError = new Error('Terjadi kesalahan saat memeriksa file.');
            generalError.code = 'FILE_CHECK_ERROR';
            return next(generalError);
        }
    }
}

export default new FileValidator();

