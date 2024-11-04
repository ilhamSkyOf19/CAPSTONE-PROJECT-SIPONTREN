import multer from 'multer';
// import path from 'path';
import fs from 'fs/promises'; // Pastikan Anda mengimpor fs/promises
import { existsSync } from 'fs';

const TYPE_IMAGE = {
    "image/jpg": 'jpg',
    "image/jpeg": 'jpeg',
    "image/png": 'png',
};


// Ukuran file maksimal (2MB)
const maxSize = 2 * 1024 * 1024; // 2MB

// File filter untuk memvalidasi tipe file yang diupload
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        const error = new Error('File tidak valid');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false); // Lempar error dengan tipe khusus
    }
};


const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const nik = req.body.nik;
        const dir = `public/imagesPendaftar/${nik}`;

        try {
            // Buat direktori jika tidak ada
            await fs.mkdir(dir, { recursive: true }); // Gunakan recursive: true untuk membuat direktori jika ada sub-direktori yang hilang
            cb(null, dir); // Set direktori penyimpanan file
        } catch (error) {
            cb(error, null); // Tangani kesalahan saat membuat direktori
        }
    },
    filename: function (req, file, cb) {
        const ext = TYPE_IMAGE[file.mimetype]; // Ekstensi file berdasarkan MIME type
        const filename = `${file.fieldname}_${Date.now()}.${ext}`.toLowerCase(); // Penamaan file menjadi lowercase
        cb(null, filename); // Mengirimkan nama file yang sudah diubah menjadi lowercase
    }    
});

// Konfigurasi multer
export const Upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: maxSize },
}).fields([
    { name: 'foto_formal', maxCount: 1 }, // Field untuk image pertama
    { name: 'akta_kelahiran', maxCount: 1 },  // Field untuk image kedua
    { name: 'kartu_keluarga', maxCount: 1 },  // Field untuk image kedua
    { name: 'fc_ktp', maxCount: 1 },  // Field untuk image kedua
    { name: 'kip_kis', maxCount: 1 },  // Field untuk image kedua
]);



const storage2 = multer.diskStorage({
    destination: async function (req, file, cb) {
        let dir;

        // Jika NIK berbeda, gunakan folder dari old_nik, jika sama gunakan folder dari NIK baru
        if (req.body.nik !== req.body.old_nik) {
            dir = `public/imagesPendaftar/${req.body.old_nik}`;
        } else {
            dir = `public/imagesPendaftar/${req.body.nik}`;
        }

        try {
            // Buat direktori baru jika belum ada
            await fs.mkdir(dir, { recursive: true });
            cb(null, dir); // Set direktori penyimpanan file
        } catch (error) {
            cb(error, null); // Tangani kesalahan saat membuat direktori
        }
    },
    filename: function (req, file, cb) {
        const ext = TYPE_IMAGE[file.mimetype]; // Ekstensi file berdasarkan MIME type
        const filename = `${file.fieldname}_${Date.now()}.${ext}`.toLowerCase(); // Penamaan file menjadi lowercase
        cb(null, filename); // Mengirimkan nama file yang sudah diubah menjadi lowercase
    }
    
});





// Konfigurasi multer
export const Upload2 = multer({
    storage: storage2,
    fileFilter: fileFilter,
    limits: { fileSize: maxSize },
}).fields([
    { name: 'foto_formal', maxCount: 1 }, // Field untuk image pertama
    { name: 'akta_kelahiran', maxCount: 1 },  // Field untuk image kedua
    { name: 'kartu_keluarga', maxCount: 1 },  // Field untuk image kedua
    { name: 'fc_ktp', maxCount: 1 },  // Field untuk image kedua
    { name: 'kip_kis', maxCount: 1 },
]);


export class FileSingleUploader {
    constructor(dirName, maxSize, thumbnail) {
        this.dirName = dirName;
        this.maxSize = maxSize;
        this.thumbnail = thumbnail;

        // Initialize multer
        this.upload = multer({
            storage: this.storage(),
            limits: { fileSize: this.maxSize },
            fileFilter: fileFilter, // Use the external file filter
        }).single(this.thumbnail);
    }

    storage() {
        return multer.diskStorage({
            destination: async (req, file, cb) => {
                const dir = `${this.dirName}/${new Date().toISOString().split('T')[0]}`;

                // Check if the directory exists
                if (!existsSync(dir)) {
                    try {
                        // Create directory if it doesn't exist
                        await fs.mkdir(dir, { recursive: true });
                    } catch (error) {
                        return cb(error, null); // Handle error while creating directory
                    }
                }
                cb(null, dir); // Set the directory for storing files
            },
            filename: (req, file, cb) => {
                const ext = TYPE_IMAGE[file.mimetype]; // Get file extension based on MIME type
                const filename = `${file.fieldname}_${Date.now()}.${ext}`.toLowerCase(); // Generate a lowercase filename
                cb(null, filename); // Send back the generated filename
            },
        });
    }
}

