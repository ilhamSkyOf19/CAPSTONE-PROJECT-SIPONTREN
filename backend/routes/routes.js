import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { validatorUbahUsername, validatorLogin, validatorUploadBerita, validatorUbahBerita, validatorUbahPassword, validatorResultPendaftar, validatorAlumni, validatorUstadUstadzah } from '../utils/validator.js';
import { capitalizeWords, deleteAlumniById, deleteBeritaById, deletePendaftarById, deleteUstadUstadzahById } from '../utils/controller.js';
import express from 'express';
import { Upload, Upload2 } from '../middleware/uploadFile.js';
import FileValidator from '../middleware/checkFile.js';
import { FileSingleUploader } from '../middleware/uploadFile.js';
import path from 'node:path';
import fs from 'fs/promises';
import fsSync from 'fs'
import Pendaftaran from '../models/pendaftaran.js';
import Berita from '../models/skemaBerita.js';
import User from '../models/skemaLogin.js';
import Alumni from '../models/skemaAlumni.js';
import Ustad from '../models/skemaUstad.js';
import argon2 from 'argon2';
import { verifyPassword } from '../utils/auth.js';
import PdfPrinter from 'pdfmake';
import { Op } from 'sequelize';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// router
const router = express.Router();

const today = new Date().toISOString().split('T')[0]; // Format tanggal

const formatTanggal = (tanggal) => {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const date = new Date(tanggal);
    return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

// listNavbar
const listNavbar = {
    home: {
        title: 'Home',
        router: '/'
    },
    profile: {
        title: 'Profile',
        router: '/profile'
    },
    kemahadan: {
        title: "Kema'hadan",
        router: '/kemahadan'
    },
    extrakulikuler: {
        title: 'Ektrakulikuler',
        router: '/#ekstrakurikuler'
    },
    psb: {
        title: 'PSB',
        router: '/psb'
    },
}




router.get('/', async (req, res) => {
    // const today = new Date().toISOString().split('T')[0]; // format tanggal

    let dataUsername = ''; // Variabel untuk menyimpan nama pengguna, default-nya kosong

    if (req.session.loggedIn) {
        try {
            const user = await User.findOne({ where: { id: req.session.loggedIn } }); // Menggunakan Sequelize untuk mencari pengguna
            if (user) {
                dataUsername = user.username; // Jika pengguna ditemukan, simpan username
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Ambil berita yang diterbitkan setelah hari ini
    const berita = await Berita.findAll(
        // {
        // where: {
        //     date: {
        //         [Sequelize.Op.gte]: today, // Mengambil berita yang memiliki tanggal >= hari ini
        //     },
        // },
        // order: [['date', 'DESC']], // Urutkan berita berdasarkan tanggal terbaru
        // }
    );


    return res.render('pages/home/index', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Halaman Utama',
        dataUsername,
        berita,
        today,
        formatTanggal,
        listNavbar,
    });
});


router.get('/login-admin', (req, res) => {
    return res.render('pages/admin/login/login-admin', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Form Login',
        data: req.body,
        msg: req.flash('msg'),
        listNavbar,
    });
});

// Proses login (POST request)
router.post('/login-admin',
    body('username').custom(async (value) => {
        const user = await User.findOne({ where: { username: value } });
        if (!user) {
            throw new Error('Username tidak terdaftar!');
        }
        return true;
    }),
    validatorLogin,
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/admin/login/login-admin', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Halaman Login',
                errors: errors.array(),
                data: req.body,
                listNavbar,
            });
        } else {
            try {
                const { username, password, _csrf } = req.body; // Ambil username dan password

                const user = await User.findOne({ where: { username } }); // Temukan user berdasarkan username
                if (!user) {
                    return res.render('pages/admin/login/login-admin', {
                        layout: 'layouts/main-ejs-layouts',
                        title: 'Halaman Login',
                        errors: [{ msg: 'Username tidak terdaftar!' }],
                        data: req.body,
                        listNavbar,
                    });
                }

                // Verifikasi password menggunakan argon2
                const isPasswordValid = await argon2.verify(user.password, password);
                if (!isPasswordValid) {
                    return res.render('pages/admin/login/login-admin', {
                        layout: 'layouts/main-ejs-layouts',
                        title: 'Halaman Login',
                        errors: [{ msg: 'Password salah!' }],
                        data: req.body,
                        listNavbar,
                    });
                }


                // Menyimpan ID user ke dalam session
                req.session.loggedIn = true;
                req.flash('msg', 'Berhasil masuk');
                return res.redirect('/'); // Redirect ke halaman utama setelah login berhasil

            } catch (error) {
                console.error('Login error:', error);
                res.status(500).send('Error logging in');
            }
        }
    }
);


// form pendaftaran
router.get('/form-pendaftaran', (req, res) => {
    res.render('pages/user/form-pendaftaran', {
        title: 'halaman pendaftar',
        layout: 'layouts/main-ejs-layouts',
        msg: req.flash('msg'),
        data: req.body,
        listNavbar,
    });
});

// Form pendaftaran
// Router POST untuk data pendaftar
router.post('/form-pendaftaran', [
    // Middleware upload file
    (req, res, next) => {
        Upload(req, res, function (error) {
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan!';
                } else if (error instanceof multer.MulterError) {
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = 'Terjadi kesalahan upload file!';
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                // Jika ada error dalam upload, render kembali form dengan pesan error
                return res.render('pages/user/form-pendaftaran', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Halaman Pendaftaran',
                    errors: [{ msg: errorMessage }],
                    data: req.body,
                    listNavbar,
                });
            }
            next(); // Jika tidak ada error, lanjut ke middleware berikutnya
        });
    },

    // Middleware untuk validasi tipe file jika ada
    async (req, res, next) => {
        await FileValidator.checkFileType(req, res, next, listNavbar, 'pages/user/form-pendaftaran');
    },

    // Validasi NIK dan NISN
    body('nik').custom(async (value) => {
        const duplikatNik = await Pendaftaran.findOne({ where: { nik: value } });
        if (duplikatNik) {
            throw new Error('Data NIK sudah terkirim!');
        }
        return true;
    }),

    body('nisn').custom(async (value) => {
        const duplikatNisn = await Pendaftaran.findOne({ where: { nisn: value } });
        if (duplikatNisn) {
            throw new Error('Data NISN sudah terkirim!');
        }
        return true;
    }),

    // Validasi dan pengecekan form
    validatorResultPendaftar
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const uploadedFiles = req.files;
        try {
            // Hapus file yang di-upload jika ada error
            for (const [key, files] of Object.entries(uploadedFiles)) {
                const file = files[0];
                if (file) {
                    await fs.unlink(file.path);
                }
            }

            // Hapus folder jika error
            fs.rm(`public/imagesPendaftar/${req.body.nik}`, { recursive: true }, (err) => {
                if (err) console.error('Error while deleting folder:', err);
            });

        } catch (err) {
            console.error('Error while deleting files or directory:', err);
        }

        return res.render('pages/user/form-pendaftaran', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Halaman Pendaftaran',
            errors: errors.array(),
            data: req.body,
            listNavbar,
        });
    } else {
        try {
            // Gabungkan data form dan alamat
            const finalData = {
                ...req.body,
            };

            // Menghandle upload file jika ada
            for (const [key, files] of Object.entries(req.files)) {
                const file = files[0];
                if (file) {
                    finalData[key] = file.filename;
                } else {
                    finalData[key] = null; // Jika file tidak ada, pastikan fieldnya null
                }
            }

            // Simpan data pendaftar ke dalam database MySQL
            await Pendaftaran.create(finalData);

            req.flash('msg', 'Data berhasil ditambahkan');
            res.redirect('/'); // Redirect ke halaman utama setelah sukses
        } catch (error) {
            console.log(error);
            const errorMessage = 'Terjadi kesalahan saat menyimpan data!';
            return res.render('pages/user/form-pendaftaran', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Halaman Pendaftaran',
                errors: [{ msg: errorMessage }],
                data: req.body,
                listNavbar,
            });
        }
    }
});



// Halaman data-pendaftar
router.get('/data-pendaftar', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        // Cari user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        // Ambil query untuk pencarian
        const query = req.query.query || '';

        // Ambil data pendaftar dari MySQL berdasarkan query
        let dataPendaftar = [];
        if (query) {
            dataPendaftar = await Pendaftaran.findAll({
                where: {
                    [Op.or]: [
                        { nama_lengkap: { [Op.like]: `%${query}%` } },
                        { nisn: { [Op.like]: `%${query}%` } },
                        { nik: { [Op.like]: `%${query}%` } },
                    ],
                },
            });
        } else {
            dataPendaftar = await Pendaftaran.findAll();
        }

        // Proses data pendaftar untuk kapitalisasi kecuali beberapa field
        dataPendaftar = dataPendaftar.map(data => {
            let pendaftar = data.dataValues; // Ambil data yang telah dimuat

            // Kapitalisasi setiap kata untuk semua field string kecuali beberapa field tertentu
            for (let key in pendaftar) {
                if (typeof pendaftar[key] === 'string' && key !== 'email' && key !== 'asal_sekolah' && key !== 'ijazah' && key !== 'kk') {
                    pendaftar[key] = capitalizeWords(pendaftar[key]);
                }
            }
            return pendaftar;
        });

        // Render halaman dengan data yang sudah diproses
        res.render('pages/admin/daftar/data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Pendaftar',
            dataPendaftar,
            dataUsername,
            msg: req.flash('msg'),
            query, // Kirim query ke frontend untuk menampilkan ulang nilai pencarian
        });
    } catch (err) {
        console.error(err);
        req.flash('msg', 'Terjadi kesalahan saat mengambil data pendaftar.');
        res.redirect('/');
    }
});

// data pendaftar detail
router.get('/data-pendaftar-detail/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    try {
        // Cari user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;
        const { id } = req.params;
        const pendaftar = await Pendaftaran.findByPk(id);

        if (!pendaftar) {
            return res.status(404).render('error', { message: 'Data pendaftar tidak ditemukan!' });
        }

        // Render halaman dengan data yang sudah diproses
        res.render('pages/admin/daftar/data-pendaftar-detail', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Pendaftar Detail',
            pendaftar,
            dataUsername,
            msg: req.flash('msg'),
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});


// Halaman data-pendaftar

// Halaman ubah data pendaftar
router.get('/ubah-data-pendaftar/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        const id = req.params.id;  // Mendapatkan ID dari parameter URL

        // Mengambil data pendaftar berdasarkan ID dengan Sequelize
        let data = await Pendaftaran.findOne({ where: { id } });

        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-pendaftar');
        }

        // Mengakses data dengan dataValues (mengambil data sesungguhnya dari Sequelize)
        let pendaftar = data.dataValues;

        // Lakukan kapitalisasi untuk semua string kecuali beberapa field tertentu
        for (let key in pendaftar) {
            if (typeof pendaftar[key] === 'string' && key !== 'foto_formal' && key !== 'akta_kelahiran' && key !== 'kartu_keluarga' && key !== 'fc_ktp' && key !== 'kip_kis') {
                pendaftar[key] = capitalizeWords(pendaftar[key]);
            }
        }

        // Ambil data user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        // Render halaman ubah data pendaftar dengan data yang sudah diproses
        res.render('pages/admin/daftar/ubah-data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Pendaftar',
            data: pendaftar,
            dataUsername,
            dataFile: '', // Tempat untuk mengirimkan file jika ada
        });
    } catch (err) {
        console.error(err);
        // Jika ada error, arahkan kembali ke halaman data pendaftar
        res.redirect('/data-pendaftar');
    }
});



// PUT ubah data pendaftar
router.put('/ubah-data', [
    (req, res, next) => {
        Upload2(req, res, async function (error) {
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = 'Terjadi kesalahan upload file!';
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }
                const user = await User.findOne({ where: { id: req.session.loggedIn } });
                const dataUsername = user.username;
                let dataPendaftar = await Pendaftaran.findByPk(req.body._id); // Temukan pendaftar berdasarkan ID
                return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Form Ubah Data Pendaftar',
                    errors: [{ msg: errorMessage }],
                    data: req.body,
                    dataFile: dataPendaftar,
                    msg: req.flash('msg'),
                    dataUsername,
                });
            }

            next();
        });
    },
    validatorResultPendaftar
]
    , async (req, res, next) => {
        if (req.files) {
            FileValidator.checkFileType2(req, res, next, 'pages/admin/daftar/ubah-data-pendaftar');
        } else {
            next();
        }
    }, async (req, res) => {
        const errors = validationResult(req);
        let dataPendaftar = await Pendaftaran.findByPk(req.body._id); // Temukan pendaftar berdasarkan ID
        if (!req.session.loggedIn) {
            return res.redirect('/login-admin');
        }
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        if (!errors.isEmpty()) {
            // Jika ada error validasi, tampilkan kembali form dengan error
            return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form Ubah Data Pendaftar',
                errors: errors.array(),
                data: req.body,
                dataFile: dataPendaftar,
                msg: req.flash('msg'),
                dataUsername,
            });
        }

        // Jika tidak ada error, lanjutkan dengan update data
        try {
            const oldNik = req.body.old_nik || '';
            const nik = req.body.nik || '';

            // Jika NIK berubah, kita perlu mengganti nama folder
            if (nik !== oldNik) {
                const oldDir = path.join('public/imagesPendaftar', oldNik);
                const newDir = path.join('public/imagesPendaftar', nik);
                await fs.rename(oldDir, newDir); // Rename folder dengan NIK yang baru
                console.log(`Folder renamed from ${oldNik} to ${nik}`);
            }

            // Proses upload file
            let fotoFormal = req.body.foto_formal || '';
            let fotoFormalOld = req.body.old_foto_formal || '';
            let aktaKelahiran = req.body.akta_kelahiran || '';
            let aktaKelahiranOld = req.body.old_akta_kelahiran || '';
            let kartuKeluarga = req.body.kartu_keluarga || '';
            let kartuKeluargaOld = req.body.old_kartu_keluarga || '';
            let fcKtp = req.body.fc_ktp || '';
            let fcKtpOld = req.body.old_fc_ktp || '';
            let kipKis = req.body.kip_kis || '';
            let kipKisOld = req.body.old_kip_kis || '';

            // Fungsi untuk menangani proses penggantian file yang diupload
            const processFile = async (field, oldFileField) => {
                if (req.files[field]) {
                    const newFileName = path.basename(req.files[field][0].path);
                    if (oldFileField) {
                        const oldFilePath = path.join('public/imagesPendaftar', nik, oldFileField);
                        await fs.unlink(oldFilePath);
                        console.log(`Old ${field} file removed`);
                    }
                    return newFileName;
                }
                return oldFileField;
            };

            // Proses file upload
            fotoFormal = await processFile('foto_formal', fotoFormalOld);
            aktaKelahiran = await processFile('akta_kelahiran', aktaKelahiranOld);
            kartuKeluarga = await processFile('kartu_keluarga', kartuKeluargaOld);
            fcKtp = await processFile('fc_ktp', fcKtpOld);
            kipKis = await processFile('kip_kis', kipKisOld);

            // Update data di database menggunakan Sequelize
            await Pendaftaran.update(
                {
                    nisn: req.body.nisn,
                    nik: req.body.nik,
                    nama_lengkap: req.body.nama_lengkap,
                    jenis_kelamin: req.body.jenis_kelamin,
                    usia: req.body.usia,
                    tempat_lahir: req.body.tempat_lahir,
                    tanggal_lahir: req.body.tanggal_lahir,
                    alamat: req.body.alamat,
                    anak_ke: req.body.anak_ke,
                    jumlah_saudara: req.body.jumlah_saudara,
                    nomor_telephone: req.body.nomor_telephone,
                    alumni_sd: req.body.alumni_sd,
                    alamat_sekolah_asal: req.body.alamat_sekolah_asal,
                    nama_lengkap_ayah: req.body.nama_lengkap_ayah,
                    nama_lengkap_ibu: req.body.nama_lengkap_ibu,
                    nama_lengkap_wali: req.body.nama_lengkap_wali,
                    kode_pos: req.body.kode_pos,
                    foto_formal: fotoFormal,
                    akta_kelahiran: aktaKelahiran,
                    kartu_keluarga: kartuKeluarga,
                    fc_ktp: fcKtp,
                    kip_kis: kipKis,
                },
                { where: { id: req.body._id } }
            );

            req.flash('msg', 'Data berhasil diubah!');
            res.redirect('/data-pendaftar'); // Redirect ke halaman data pendaftar
        } catch (error) {
            console.error(error);
            let errorMessage = 'Terjadi kesalahan saat menyimpan data ke database!';
            if (error.name === 'SequelizeValidationError') {
                errorMessage = error.errors.map(err => err.message).join(', ');
            }

            return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form Ubah Data Pendaftar',
                errors: [{ msg: errorMessage }],
                data: req.body,
                dataFile: dataPendaftar,
                msg: req.flash('msg'),
                dataUsername,
            });
        }
    });



// Data alumni
router.get('/data-alumni', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        // Cari user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        // Ambil query untuk pencarian
        const query = req.query.query || '';

        // Ambil data pendaftar dari MySQL berdasarkan query
        let dataAlumni = [];
        if (query) {
            dataAlumni = await Alumni.findAll({
                where: {
                    [Op.or]: [
                        { nama_alumni: { [Op.like]: `%${query}%` } },
                        { angkatan: { [Op.like]: `%${query}%` } },
                    ],
                },
            });
        } else {
            dataAlumni = await Alumni.findAll();
        }

        // Proses data pendaftar untuk kapitalisasi kecuali beberapa field
        dataAlumni = dataAlumni.map(data => {
            let alumni = data.dataValues; // Ambil data yang telah dimuat

            // Kapitalisasi setiap kata untuk semua field string kecuali beberapa field tertentu
            for (let key in alumni) {
                if (typeof alumni[key] === 'string') {
                    alumni[key] = capitalizeWords(alumni[key]);
                }
            }
            return alumni;
        });


        // Render halaman dengan data yang sudah diproses
        res.render('pages/admin/daftar/data-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Alumni',
            dataAlumni,
            dataUsername,
            msg: req.flash('msg'),
            query, // Kirim query ke frontend untuk menampilkan ulang nilai pencarian
        });
    } catch (err) {
        console.error(err);
        req.flash('msg', 'Terjadi kesalahan saat mengambil data pendaftar.');
        res.redirect('/');
    }
});

// data ulumni user
// router.get('/data-alumni-user', async (req, res) => {
//     try {
//         // Ambil query untuk pencarian
//         const query = req.query.query || '';

//         // Ambil data pendaftar dari MySQL berdasarkan query
//         let dataAlumni = [];
//         if (query) {
//             dataAlumni = await Alumni.findAll({
//                 where: {
//                     [Op.or]: [
//                         { nama_alumni: { [Op.like]: `%${query}%` } },
//                         { angkatan: { [Op.like]: `%${query}%` } },
//                     ],
//                 },
//             });
//         } else {
//             dataAlumni = await Alumni.findAll();
//         }

//         // Proses data pendaftar untuk kapitalisasi kecuali beberapa field
//         dataAlumni = dataAlumni.map(data => {
//             let alumni = data.dataValues; // Ambil data yang telah dimuat

//             // Kapitalisasi setiap kata untuk semua field string kecuali beberapa field tertentu
//             for (let key in alumni) {
//                 if (typeof alumni[key] === 'string') {
//                     alumni[key] = capitalizeWords(alumni[key]);
//                 }
//             }
//             return alumni;
//         });


//         // Render halaman dengan data yang sudah diproses
//         res.render('pages/admin/daftar/data-alumni-user', {
//             layout: 'layouts/main-ejs-layouts',
//             title: 'Data Alumni',
//             dataAlumni,
//             msg: req.flash('msg'),
//             query, // Kirim query ke frontend untuk menampilkan ulang nilai pencarian
//             listNavbar,
//         });
//     } catch (err) {
//         console.error(err);
//         req.flash('msg', 'Terjadi kesalahan saat mengambil data pendaftar.');
//         res.redirect('/');
//     }
// });

// tambah data alumni

router.get('/tambah-data-alumni', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    res.render('pages/admin/daftar/tambah-data-alumni', {
        layout: 'layouts/main-ejs-layouts',
        title: 'tambah data alumni',
        dataUsername,
        data: req.body,
    });
});


// Route untuk menambah berita ke database
const maxSizeGambar = 2 * 1024 * 1024; // 2MB limit
const uploaderAlumni = new FileSingleUploader('public/imagesAlumni', maxSizeGambar, 'imgAlumni', false);
router.post('/form-alumni', [
    (req, res, next) => {
        // Pertama, jalankan Upload middleware untuk menangani file
        uploaderAlumni.upload(req, res, async function (error) {
            // Tangani kesalahan dari multer jika ada
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    // Tangani kesalahan dari multer (seperti ukuran file terlalu besar)
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = `Terjadi kesalahan upload file! ${error}`;
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/daftar/tambah-data-alumni', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'tambah data alumni',
                    errors: [{ msg: errorMessage }],
                    data: req.body, // Menyimpan input sebelumnya
                    dataUsername,
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType, arahkan ke 'index' jika error
        await FileValidator.checkFileType3(req, res, next, 'pages/admin/daftar/tambah-data-alumni');
    },

    validatorAlumni
], async (req, res) => {
    // data username
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus file jika ada error
        const uploadedFile = req.file; // Menggunakan req.file, bukan req.files

        try {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Hapus file
            }
        } catch (err) {
            console.error('Error while deleting file:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }

        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('pages/admin/daftar/tambah-data-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'tambah data alumni',
            errors: errors.array(),
            data: req.body,
            dataUsername,
        });
    } else {
        const { nama_alumni, angkatan, pesan } = req.body;
        const imgAlumni = req.file ? req.file.filename : null;

        try {
            // Simpan berita ke dalam MySQL menggunakan Sequelize
            await Alumni.create({
                nama_alumni,
                angkatan,
                imgAlumni,
                pesan,
            });
            // tampilkan pesan berhasil
            req.flash('msg', 'Data berhasil ditambah!');
            res.redirect('/data-alumni'); // Setelah sukses, redirect ke halaman utama
        } catch (err) {
            console.error('Error saving berita:', err);
            res.status(500).send('Terjadi kesalahan saat menyimpan berita');
        }
    }
});


// ubah data alumni 
router.get('/ubah-data-alumni/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        const id = req.params.id;  // Mendapatkan ID dari parameter URL

        // Mengambil data pendaftar berdasarkan ID dengan Sequelize
        let data = await Alumni.findOne({ where: { id } });

        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-alumni');
        }

        // Mengakses data dengan dataValues (mengambil data sesungguhnya dari Sequelize)
        let alumni = data.dataValues;

        // Lakukan kapitalisasi untuk semua string kecuali beberapa field tertentu
        for (let key in data) {
            if (typeof alumni[key] === 'string') {
                alumni[key] = capitalizeWords(alumni[key]);
            }
        }

        // Ambil data user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        // Render halaman ubah data pendaftar dengan data yang sudah diproses
        res.render('pages/admin/daftar/ubah-data-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Pendaftar',
            data: alumni,
            dataUsername
        });
    } catch (err) {
        console.error(err);
        // Jika ada error, arahkan kembali ke halaman data pendaftar
        res.redirect('/data-pendaftar');
    }
});

// data alumni detail
router.get('/data-detail-alumni/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');

    }
    try {
        // Cari user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;
        const { id } = req.params;
        const alumni = await Alumni.findByPk(id);

        if (!alumni) {
            return res.status(404).render('error', { message: 'Data pendaftar tidak ditemukan!' });
        }

        // Render halaman dengan data yang sudah diproses
        res.render('pages/admin/daftar/data-detail-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Alumi Detail',
            dataAlumni: alumni,
            dataUsername,
            msg: req.flash('msg'),
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// Halaman ubah data alumni
router.get('/ubah-data-alumni/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        const id = req.params.id;  // Mendapatkan ID dari parameter URL

        // Mengambil data pendaftar berdasarkan ID dengan Sequelize
        let data = await Alumni.findOne({ where: { id } });

        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-alumni');
        }

        // Mengakses data dengan dataValues (mengambil data sesungguhnya dari Sequelize)
        let alumni = data.dataValues;

        // Lakukan kapitalisasi untuk semua string kecuali beberapa field tertentu
        for (let key in data) {
            if (typeof alumni[key] === 'string') {
                alumni[key] = capitalizeWords(alumni[key]);
            }
        }

        // Ambil data user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;
        // Render halaman ubah data pendaftar dengan data yang sudah diproses
        res.render('pages/admin/daftar/ubah-data-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Pendaftar',
            data: alumni,
            dataUsername,
            dataFile: '',
        });
    } catch (err) {
        console.error(err);
        // Jika ada error, arahkan kembali ke halaman data pendaftar
        res.redirect('/data-alumni');
    }
});

// PUT ubah data pendaftar
router.put('/ubah-data-alumni', [
    (req, res, next) => {
        // Jalankan upload middleware untuk menangani file
        uploaderAlumni.upload(req, res, async function (error) {
            let dataAlumni = await Alumni.findByPk(req.body._id);
            // Tangani kesalahan jika ada
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    // Tangani kesalahan dari multer (seperti ukuran file terlalu besar)
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = `Terjadi kesalahan upload file! ${error}`;
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/daftar/ubah-data-alumni', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Ubah Data Alumni',
                    errors: [{ msg: errorMessage }],
                    data: req.body,  // Menyimpan input sebelumnya
                    dataUsername,
                    dataFile: dataAlumni,
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType jika perlu
        await FileValidator.checkFileType3(req, res, next, 'pages/admin/daftar/ubah-data-alumni');
    },

    validatorAlumni
], async (req, res) => {
    // data username
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    // data alumni
    let dataAlumni = await Alumni.findByPk(req.body._id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus file jika ada error
        const uploadedFile = req.file; // Menggunakan req.file, bukan req.files

        try {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Hapus file yang baru diunggah
            }
        } catch (err) {
            console.error('Error while deleting file:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }

        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('pages/admin/daftar/ubah-data-alumni', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Alumni',
            errors: errors.array(),
            data: req.body,
            dataFile: dataAlumni,
            dataUsername,
        });
    } else {
        const { nama_alumni, angkatan, pesan, _id, oldImgAlumni } = req.body;

        // Tentukan gambar alumni yang baru (jika ada) atau gunakan gambar lama
        let imgAlumni = req.file ? req.file.filename : oldImgAlumni;

        // Hapus gambar lama jika ada gambar baru yang diunggah
        if (req.file && oldImgAlumni) {
            const oldImgPath = path.join('public', 'imagesAlumni', oldImgAlumni);
            if (fsSync.existsSync(oldImgPath)) {
                fsSync.unlinkSync(oldImgPath); // Menghapus gambar lama
            }
        }

        try {
            // Update data alumni di database
            await Alumni.update(
                {
                    nama_alumni,
                    angkatan,
                    pesan,
                    imgAlumni, // Menggunakan gambar baru atau gambar lama
                },
                { where: { id: _id } }
            );

            req.flash('msg', 'Data alumni berhasil diubah!');
            res.redirect('/data-alumni'); // Redirect ke halaman data alumni setelah berhasil
        } catch (error) {
            console.error('Terjadi kesalahan:', error);
            let errorMessage = 'Terjadi kesalahan saat menyimpan data ke database!';
            if (error.name === 'SequelizeValidationError') {
                errorMessage = error.errors.map(err => err.message).join(', ');
            }
            return res.render('pages/admin/daftar/ubah-data-alumni', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form Ubah Data Alumni',
                errors: [{ msg: errorMessage }],
                data: req.body,
                msg: req.flash('msg'),
                dataFile: dataAlumni,
                dataUsername,
            });
        }
    }
});


// delete alumni
router.delete('/data-alumni/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const result = await deleteAlumniById(req.params.id);

    // Menggunakan flash untuk mengirim pesan ke pengguna
    req.flash('msg', result.message);

    // Redirect ke halaman daftar berita
    res.redirect('/data-alumni');
});


// data ustad / ustadzah
router.get('/data-ustad-ustadzah', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        // Cari user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        // Ambil query untuk pencarian
        const query = req.query.query || '';

        // Ambil data pendaftar dari MySQL berdasarkan query
        let dataUstad = [];
        if (query) {
            dataUstad = await Ustad.findAll({
                where: {
                    [Op.or]: [
                        { nama_ustad: { [Op.like]: `%${query}%` } },
                        { posisi: { [Op.like]: `%${query}%` } },
                    ],
                },
            });
        } else {
            dataUstad = await Ustad.findAll();
        }

        // Proses data pendaftar untuk kapitalisasi kecuali beberapa field
        dataUstad = dataUstad.map(data => {
            let ustad = data.dataValues; // Ambil data yang telah dimuat

            // Kapitalisasi setiap kata untuk semua field string kecuali beberapa field tertentu
            for (let key in ustad) {
                if (typeof ustad[key] === 'string') {
                    ustad[key] = capitalizeWords(ustad[key]);
                }
            }
            return ustad;
        });


        // Render halaman dengan data yang sudah diproses
        res.render('pages/admin/daftar/data-ustad-ustadzah', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Ustad dan Ustadzah',
            dataUstad,
            dataUsername,
            msg: req.flash('msg'),
            query, // Kirim query ke frontend untuk menampilkan ulang nilai pencarian
        });
    } catch (err) {
        console.error(err);
        req.flash('msg', 'Terjadi kesalahan saat mengambil data ustad dan ustadzah.');
        res.redirect('/');
    }
});

// tambah data ustad / ustadzah
router.get('/tambah-data-ustad-ustadzah', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    res.render('pages/admin/daftar/tambah-data-ustad-ustadzah', {
        layout: 'layouts/main-ejs-layouts',
        title: 'tambah data ustad / ustadzah',
        dataUsername,
        data: req.body,
    });
});


// Route untuk menambah data ustad / ustadzah ke database
const uploaderUstad = new FileSingleUploader('public/imagesUstadUstadzah', maxSizeGambar, 'img_ustad_ustadzah', false);
router.post('/form-ustad-ustadzah', [
    (req, res, next) => {
        // Pertama, jalankan Upload middleware untuk menangani file
        uploaderUstad.upload(req, res, async function (error) {
            // Tangani kesalahan dari multer jika ada
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    // Tangani kesalahan dari multer (seperti ukuran file terlalu besar)
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = `Terjadi kesalahan upload file! ${error}`;
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/daftar/tambah-data-ustad-ustadzah', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'tambah data ustad / ustadzah',
                    errors: [{ msg: errorMessage }],
                    data: req.body, // Menyimpan input sebelumnya
                    dataUsername,
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType, arahkan ke 'index' jika error
        await FileValidator.checkFileType3(req, res, next, 'pages/admin/daftar/tambah-data-ustad-ustadzah');
    },

    validatorUstadUstadzah
], async (req, res) => {
    // data username
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus file jika ada error
        const uploadedFile = req.file; // Menggunakan req.file, bukan req.files

        try {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Hapus file
            }
        } catch (err) {
            console.error('Error while deleting file:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }

        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('pages/admin/daftar/tambah-data-ustad-ustadzah', {
            layout: 'layouts/main-ejs-layouts',
            title: 'tambah data ustad / ustadzah',
            errors: errors.array(),
            data: req.body,
            dataUsername
        });
    } else {
        const { nama_ustad_ustadzah, posisi } = req.body;
        const img_ustad_ustadzah = req.file ? req.file.filename : null;

        try {
            // Simpan berita ke dalam MySQL menggunakan Sequelize
            await Ustad.create({
                nama_ustad_ustadzah,
                posisi,
                img_ustad_ustadzah,
            });
            // tampilkan pesan berhasil
            req.flash('msg', 'Data berhasil ditambah!');
            res.redirect('/data-ustad-ustadzah'); // Setelah sukses, redirect ke halaman utama
        } catch (err) {
            console.error('Error saving berita:', err);
            res.status(500).send('Terjadi kesalahan saat menyimpan data');
        }
    }
});


// Halaman ubah data ustad / ustadzah
router.get('/ubah-data-ustad-ustadzah/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    try {
        const id = req.params.id;  // Mendapatkan ID dari parameter URL

        // Mengambil data pendaftar berdasarkan ID dengan Sequelize
        let data = await Ustad.findOne({ where: { id } });

        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-ustad-ustadzah');
        }

        // Mengakses data dengan dataValues (mengambil data sesungguhnya dari Sequelize)
        let ustadUstadzah = data.dataValues;

        // Lakukan kapitalisasi untuk semua string kecuali beberapa field tertentu
        for (let key in data) {
            if (typeof ustadUstadzah[key] === 'string') {
                ustadUstadzah[key] = capitalizeWords(ustadUstadzah[key]);
            }
        }

        // Ambil data user yang sedang login
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;
        // Render halaman ubah data pendaftar dengan data yang sudah diproses
        res.render('pages/admin/daftar/ubah-data-ustad-ustadzah', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Ustad / Ustadzah',
            data: ustadUstadzah,
            dataUsername,
            dataFile: '',
        });
    } catch (err) {
        console.error(err);
        // Jika ada error, arahkan kembali ke halaman data pendaftar
        res.redirect('/data-ustad-ustadzah');
    }
});

// PUT ubah data pendaftar
router.put('/ubah-data-ustad-ustadzah', [
    (req, res, next) => {
        // Jalankan upload middleware untuk menangani file
        uploaderUstad.upload(req, res, async function (error) {
            let dataUstadUstadzah = await Ustad.findByPk(req.body._id);
            // Tangani kesalahan jika ada
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    // Tangani kesalahan dari multer (seperti ukuran file terlalu besar)
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = `Terjadi kesalahan upload file! ${error}`;
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/daftar/ubah-data-ustad-ustadzah', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Ubah Data Ustad / Ustadzah',
                    errors: [{ msg: errorMessage }],
                    data: req.body,  // Menyimpan input sebelumnya
                    dataUsername,
                    dataFile: dataUstadUstadzah,
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType jika perlu
        await FileValidator.checkFileType3(req, res, next, 'pages/admin/daftar/ubah-data-ustad-ustadzah');
    },
    validatorUstadUstadzah
], async (req, res) => {
    // data username
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    // data ustad / ustadzah
    let dataUstadUstadzah = await Ustad.findByPk(req.body._id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus file jika ada error
        const uploadedFile = req.file; // Menggunakan req.file, bukan req.files

        try {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Hapus file yang baru diunggah
            }
        } catch (err) {
            console.error('Error while deleting file:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }

        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('pages/admin/daftar/ubah-data-ustad-ustadzah', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Ustad / Ustadzah',
            errors: errors.array(),
            data: req.body,
            dataFile: dataUstadUstadzah,
            dataUsername,
        });
    } else {
        const { nama_ustad_ustadzah, posisi, oldImg_ustad_ustadzah } = req.body;

        // Tentukan gambar alumni yang baru (jika ada) atau gunakan gambar lama
        let img_ustad_ustadzah = req.file ? req.file.filename : oldImg_ustad_ustadzah;

        // Hapus gambar lama jika ada gambar baru yang diunggah
        if (req.file && oldImg_ustad_ustadzah) {
            const oldImgPath = path.join('public', 'imagesUstadUstadzah', oldImg_ustad_ustadzah);
            if (fsSync.existsSync(oldImgPath)) {
                fsSync.unlinkSync(oldImgPath); // Menghapus gambar lama
            }
        }

        try {
            // Update data alumni di database
            await Ustad.update(
                {
                    nama_ustad_ustadzah,
                    posisi,
                    img_ustad_ustadzah, // Menggunakan gambar baru atau gambar lama
                },
                { where: { id: req.body._id } }
            );

            req.flash('msg', 'Data Ustad / Ustadzah berhasil diubah!');
            res.redirect('/data-ustad-ustadzah'); // Redirect ke halaman data alumni setelah berhasil
        } catch (error) {
            console.error('Terjadi kesalahan:', error);
            let errorMessage = 'Terjadi kesalahan saat menyimpan data ke database!';
            if (error.name === 'SequelizeValidationError') {
                errorMessage = error.errors.map(err => err.message).join(', ');
            }
            return res.render('pages/admin/daftar/ubah-data-ustad-ustadzah', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Ubah Data Ustad / Ustadzah',
                errors: [{ msg: errorMessage }],
                data: req.body,
                msg: req.flash('msg'),
                dataFile: dataUstadUstadzah,
                dataUsername,
            });
        }
    }
});



// router detail ustad ustadzah 
router.get('/data-detail-ustad-ustadzah/:id', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // format tanggal
        const id = req.params.id;

        // Menggunakan Sequelize untuk mencari data berdasarkan primary key
        let data = await Ustad.findByPk(id); // Gantilah findById dengan findByPk

        // Jika data tidak ditemukan, arahkan ke halaman beranda
        if (!data) {
            return res.redirect('/data-ustad-ustadzah'); // Atau bisa ganti dengan res.status(404).send('Berita tidak ditemukan')
        }
        // Jika ada session, berarti admin, cari data pengguna
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user ? user.username : 'Admin';  // Ambil username atau set default 'Admin'

        // Render halaman detail berita untuk admin
        res.render('pages/admin/daftar/data-detail-ustad-ustadzah', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Data Detail Ustad / Ustadzah',
            dataUstadUstadzah: data,
            dataUsername,  // Tampilkan data pengguna
        });
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error('Error fetching data:', err);
        res.redirect('/data-ustad-ustadzah');  // Bisa juga kirim status 500 dan error message ke user
    }
});


// Hapus data ustad dan ustadzah
router.delete('/data-ustad-ustadzah/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const result = await deleteUstadUstadzahById(req.params.id);

    // Menggunakan flash untuk mengirim pesan ke pengguna
    req.flash('msg', result.message);

    // Redirect ke halaman daftar berita
    res.redirect('/data-ustad-ustadzah');
});


// daftar berita 
router.get('/daftar-berita', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    // const today = new Date().toISOString().split('T')[0]; // Format tanggal

    try {
        // Mengambil berita dengan kondisi `date >= today` dan mengurutkan berdasarkan tanggal (desc)
        const berita = await Berita.findAll();

        // Mengambil data pengguna berdasarkan ID session
        const user = await User.findOne({ where: { id: req.session.loggedIn } });

        // Menyediakan username untuk ditampilkan di halaman
        const dataUsername = user ? user.username : '';

        return res.render('pages/admin/berita/daftar-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Daftar Berita',
            msg: req.flash('msg'),
            berita,
            dataUsername,
            today,
        });
    } catch (err) {
        console.error('Error fetching berita:', err);
        res.status(500).send('Terjadi kesalahan saat mengambil daftar berita.');
    }
});


// Route untuk form tambah berita
router.get('/form-berita', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    res.render('pages/admin/berita/form-berita', {
        layout: 'layouts/main-ejs-layouts',
        title: 'form berita',
        dataUsername,
        data: req.body,
    });
});


// Route untuk menambah berita ke database
const maxSize = 2 * 1024 * 1024; // 2MB limit
const uploaderberita = new FileSingleUploader('public/imageBerita', maxSize, 'thumbnail');
router.post('/form-berita', [
    (req, res, next) => {
        // Pertama, jalankan Upload middleware untuk menangani file
        uploaderberita.upload(req, res, async function (error) {
            // Tangani kesalahan dari multer jika ada
            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    // Tangani kesalahan dari multer (seperti ukuran file terlalu besar)
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = 'Terjadi kesalahan upload file!';
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }

                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/berita/form-berita', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'form berita',
                    errors: [{ msg: errorMessage }],
                    data: req.body, // Menyimpan input sebelumnya
                    dataUsername,
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType, arahkan ke 'index' jika error
        await FileValidator.checkFileType3(req, res, next, 'pages/admin/berita/form-berita');
    },

    validatorUploadBerita
], async (req, res) => {
    // data username
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus file jika ada error
        const uploadedFile = req.file; // Menggunakan req.file, bukan req.files

        try {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Hapus file
            }
        } catch (err) {
            console.error('Error while deleting file:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }

        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('pages/admin/berita/form-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'form-berita',
            errors: errors.array(),
            data: req.body,
            dataUsername
        });
    } else {
        const { title, content, tanggal_berita, kategori } = req.body;
        const thumbnail = req.file ? req.file.filename : null;

        try {
            // Simpan berita ke dalam MySQL menggunakan Sequelize
            await Berita.create({
                title,
                content,
                thumbnail,
                kategori,
                tanggal_berita,
            });
            // tampilkan pesan berhasil
            req.flash('msg', 'Data berhasil ditambah!');
            res.redirect('/'); // Setelah sukses, redirect ke halaman utama
        } catch (err) {
            console.error('Error saving berita:', err);
            res.status(500).send('Terjadi kesalahan saat menyimpan berita');
        }
    }
});


// Route untuk form ubah berita
router.get('/ubah-berita/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    try {
        let id = req.params.id;
        let data = await Berita.findByPk(id);
        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/');
        }
        console.log(today);
        res.render('pages/admin/berita/ubah-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'form ubah berita',
            dataUsername,
            data,
            today,
            dataFile: '',
        });
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error(err);
        res.redirect('/');
    }

});



// Ubah data berita
const uploaderUbahBerita = new FileSingleUploader(`public/imageBerita`, maxSize, 'thumbnail');
router.put('/ubah-berita',
    (req, res, next) => {
        // Jalankan Upload middleware untuk menangani file
        uploaderUbahBerita.upload(req, res, async (error) => {
            let dataBerita = await Berita.findByPk(req.body._id); // Ganti findById dengan findByPk untuk Sequelize

            if (error) {
                let errorMessage;
                if (error.code === 'INVALID_FILE_TYPE') {
                    errorMessage = 'File tidak sesuai dengan yang diharapkan (harus .jpg, .jpeg, atau .png)!';
                } else if (error instanceof multer.MulterError) {
                    if (error.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'Ukuran file terlalu besar! Maksimum 2MB.';
                    } else {
                        errorMessage = 'Terjadi kesalahan upload file!';
                    }
                } else {
                    errorMessage = error.message || 'Terjadi kesalahan saat upload file!';
                }
                const user = await User.findOne({ _id: req.session.loggedIn });
                const dataUsername = user.username;
                return res.render('pages/admin/berita/ubah-berita', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Form',
                    errors: [{ msg: errorMessage }],
                    data: req.body,
                    msg: req.flash('msg'),
                    dataFile: dataBerita,
                    today,
                    dataUsername
                });
            }

            // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
            next();
        });
    }, async (req, res, next) => {
        if (req.file) {
            FileValidator.checkFileType3(req, res, next, 'pages/admin/berita/ubah-berita');
        } else {
            next();
        }
    },
    // validator ubah berita
    validatorUbahBerita
    , async (req, res) => {
        // data username
        const user = await User.findOne({ _id: req.session.loggedIn });
        const dataUsername = user.username;

        const errors = validationResult(req);
        const dataBerita = await Berita.findByPk(req.body._id); // Ganti findById dengan findByPk untuk Sequelize

        if (!errors.isEmpty()) {
            return res.render('pages/admin/berita/ubah-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'ubah data berita',
                errors: errors.array(),
                data: req.body,
                msg: req.flash('msg'),
                dataFile: dataBerita,
                today,
                dataUsername,
            });
        } else {
            try {
                let thumbnailOld = req.body.thumbnailOld || ''; // Ambil nama file lama
                let thumbnail = req.body.thumbnail || thumbnailOld; // Jika tidak ada file baru, gunakan file lama

                // Jika ada file yang diupload
                if (req.file) {
                    try {
                        const newFileName = path.basename(req.file.path);  // Ambil nama file baru

                        // Hapus file lama jika ada
                        if (thumbnailOld) {
                            const oldFilePath = path.join('public/imageBerita', today, thumbnailOld);

                            // Cek apakah file lama ada, jika ada hapus
                            try {
                                await fs.access(oldFilePath, fs.constants.F_OK);  // Cek keberadaan file lama
                                await fs.unlink(oldFilePath);  // Hapus file lama
                                console.log(`Old file removed: ${oldFilePath}`);
                            } catch (err) {
                                // Jika file tidak ditemukan, tidak perlu melakukan apa-apa
                                console.log(`No old file to remove: ${oldFilePath}`);
                            }
                        }

                        // Set thumbnail ke file baru
                        thumbnail = newFileName;
                    } catch (err) {
                        console.error("Error processing files:", err);
                        return res.status(500).send("Error processing files");
                    }
                } else {
                    console.log('No file uploaded');
                }

                // Update data berita menggunakan Sequelize
                await Berita.update(
                    {
                        title: req.body.title,
                        content: req.body.content,
                        tanggal_berita: req.body.tanggal_berita,
                        thumbnail: thumbnail, // Gunakan thumbnail yang baru diproses
                        ketegori: req.body.kategori,
                    },
                    {
                        where: { id: req.body._id } // Gantilah _id dengan id jika sesuai dengan skema Anda
                    }
                );

                req.flash('msg', 'Data berhasil diubah!');
                res.redirect('/daftar-berita');
            } catch (error) {
                let errorMessage = error.name === 'ValidationError' ?
                    Object.values(error.errors).map(err => err.message).join(', ') :
                    'Terjadi kesalahan saat menyimpan data ke database!';

                return res.render('pages/admin/berita/ubah-berita', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'Form Ubah Berita',
                    errors: [{ msg: errorMessage }],
                    data: req.body,
                    msg: req.flash('msg'),
                    dataFile: dataBerita,
                    today,
                    dataUsername,
                });
            }
        }
    });


// router detail berita 
router.get('/detail-berita/:id', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // format tanggal
        const id = req.params.id;

        // Menggunakan Sequelize untuk mencari data berdasarkan primary key
        let data = await Berita.findByPk(id); // Gantilah findById dengan findByPk

        // Jika data tidak ditemukan, arahkan ke halaman beranda
        if (!data) {
            return res.redirect('/'); // Atau bisa ganti dengan res.status(404).send('Berita tidak ditemukan')
        }

        // Cek apakah session loggedIn ada (admin)
        if (req.session.loggedIn) {
            // Jika ada session, berarti admin, cari data pengguna
            const user = await User.findOne({ where: { id: req.session.loggedIn } });
            const dataUsername = user ? user.username : 'Admin';  // Ambil username atau set default 'Admin'

            // Render halaman detail berita untuk admin
            res.render('pages/admin/berita/detail-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Detail Berita',
                data,
                dataUsername,  // Tampilkan data pengguna
                today,
                formatTanggal,
            });
        } else {

            // Jika session tidak ada, berarti user biasa
            // Render halaman detail berita tanpa data pengguna (user biasa)
            res.render('pages/admin/berita/detail-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Detail Berita',
                data,
                today,
                formatTanggal,
                listNavbar,
            });
        }

    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error('Error fetching data:', err);
        res.redirect('/');  // Bisa juga kirim status 500 dan error message ke user
    }
});



// Hapus data berita
router.delete('/daftar-berita/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const result = await deleteBeritaById(req.params.id);

    // Menggunakan flash untuk mengirim pesan ke pengguna
    req.flash('msg', result.message);

    // Redirect ke halaman daftar berita
    res.redirect('/daftar-berita');
});



// hapus data pendaftar
router.delete('/data-pendaftar/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const result = await deletePendaftarById(req.params.id);

    // Menggunakan flash untuk mengirim pesan ke pengguna
    req.flash('msg', result.message);

    // Redirect ke halaman daftar berita
    res.redirect('/data-pendaftar');
});





// ubah username 
router.get('/ubah-username', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ where: { id: req.session.loggedIn } });
    const dataUsername = user.username;
    res.render('pages/admin/auth/ubah-username', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Form Ubah Username',
        msg: req.flash('msg'),
        user,
        dataUsername,
    });
});

// ubah username
router.put('/ubah-username',
    validatorUbahUsername, // Middleware untuk validasi input
    async (req, res) => {
        if (!req.session.loggedIn) {
            return res.redirect('/login-admin');
        }
        const user = await User.findOne({ where: { id: req.session.loggedIn } });
        const dataUsername = user.username;

        const { _id, usernameLama, password, usernameBaru } = req.body;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const user = await User.findOne({ where: { id: _id } }); // Ambil user berdasarkan ID
            return res.render('pages/admin/auth/ubah-username', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form Ubah Username',
                errors: errors.array(),
                user,
                dataUsername,
            });
        } else {
            try {
                // Mencari user berdasarkan ID yang dikirimkan dari form
                const user = await User.findByPk(_id); // Metode Sequelize untuk mencari primary key
                if (!user) {
                    req.flash('msg', 'User tidak ditemukan');
                    return res.redirect('/ubah-username');
                }

                // Verifikasi username lama
                if (user.username !== usernameLama) {
                    req.flash('msg', 'Username lama tidak cocok');
                    return res.redirect('/ubah-username');
                }

                // Verifikasi password lama
                const isPasswordValid = await verifyPassword(user.password, password);
                if (!isPasswordValid) {
                    req.flash('msg', 'Password salah');
                    return res.redirect('/ubah-username');
                }
                console.log('Password valid. Melanjutkan ke proses pengubahan username.');
                // Update username
                user.username = usernameBaru;
                await user.save(); // Menyimpan perubahan ke database

                req.flash('msg', 'Username berhasil diubah');
                return res.redirect('/ubah-username');
            } catch (error) {
                console.error(error);
                req.flash('msg', 'Terjadi kesalahan saat memproses permintaan');
                return res.redirect('/ubah-username');
            }
        }
    }
);


// ubah password
router.get('/ubah-password', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ where: { id: req.session.loggedIn } });
    const dataUsername = user.username;
    res.render('pages/admin/auth/ubah-password', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Form Ubah Password',
        msg: req.flash('msg'),
        user,
        dataUsername,
    });
});

// BERIKAN VALIDASI ERROR TERHADAP VALIDATOR   
// ubah password
router.put('/ubah-password', validatorUbahPassword, async (req, res) => {
    const { _id, username, passwordLama, passwordBaru, konfirmasiPassword } = req.body;

    try {
        // Cari user berdasarkan ID
        const user = await User.findByPk(_id);

        // 1. Validasi apakah user ditemukan
        if (!user || user.username !== username) {
            req.flash('msg', 'Username tidak ditemukan');
            return res.redirect('/ubah-password');
        }

        // 2. Verifikasi password lama menggunakan fungsi verifyPassword
        const isPasswordLamaValid = await verifyPassword(user.password, passwordLama.trim());
        if (!isPasswordLamaValid) {
            req.flash('msg', 'Password lama salah');
            return res.redirect('/ubah-password');
        }

        // 3. Validasi password baru dan konfirmasi password
        if (passwordBaru.trim() !== konfirmasiPassword.trim()) {
            req.flash('msg', 'Password baru dan konfirmasi password tidak cocok');
            return res.redirect('/ubah-password');
        }

        // 4. Update password baru (hashing dilakukan di Sequelize hooks)
        user.password = passwordBaru.trim(); // Assign password baru
        await user.save(); // Sequelize akan otomatis menghash di hook `beforeUpdate`

        // Kirim pesan sukses
        req.flash('msg', 'Password berhasil diubah');
        return res.redirect('/ubah-password'); // Ganti dengan halaman sesuai keinginan Anda

    } catch (error) {
        console.error(error);
        req.flash('msg', 'Terjadi kesalahan di server');
        return res.redirect('/ubah-password');
    }
});




// download file pdf
router.get('/download-pdf', async (req, res) => {
    try {
        // Ambil data dari database
        const dataPendaftar = await Pendaftaran.findAll({
            attributes: [
                'nisn',
                'nik',
                'nama_lengkap',
                'jenis_kelamin',
                'usia',
                'tempat_lahir',
                'tanggal_lahir',
                'alamat',
                'anak_ke',
                'jumlah_saudara',
                'nomor_telephone',
                'alumni_sd',
                'alamat_sekolah_asal',
                'nama_lengkap_ayah',
                'nama_lengkap_ibu',
                'nama_lengkap_wali',
                'kode_pos',
            ],
        });

        // Ubah data menjadi array untuk PDF
        const tableBody = [
            [
                { text: 'NISN', bold: true },
                { text: 'NIK', bold: true },
                { text: 'Nama Lengkap', bold: true },
                { text: 'Jenis Kelamin', bold: true },
                { text: 'Usia', bold: true },
                { text: 'Tanggal Lahir', bold: true },
            ],
        ];

        dataPendaftar.forEach((pendaftar) => {
            tableBody.push([
                pendaftar.nisn,
                pendaftar.nik,
                pendaftar.nama_lengkap,
                pendaftar.jenis_kelamin,
                pendaftar.usia,
                pendaftar.tanggal_lahir,
            ]);
        });

        const docDefinition = {
            content: [
                { text: 'Data Pendaftar', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['10%', '15%', '20%', '15%', '10%', '15%'],
                        body: tableBody,
                    },
                },
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    marginBottom: 10,
                },
            },
        };

        // Pastikan path font sudah benar dan file font tersedia
        const fonts = {
            Roboto: {
                bold: './public/fonts/Roboto-Bold.ttf',
                normal: './public/fonts/Roboto-Regular.ttf',
                italics: './public/fonts/Roboto-Italic.ttf',
                bolditalics: './public/fonts/Roboto-BoldItalic.ttf',
            },
        };

        const printer = new PdfPrinter(fonts);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        // Tentukan folder dan path untuk menyimpan PDF
        const outputDir = path.join(process.cwd(), 'public', 'output');
        const filePath = path.join(outputDir, 'pendaftar.pdf');

        // Pastikan folder output ada, jika belum buat
        if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
        }

        const writeStream = fsSync.createWriteStream(filePath);

        // Pipe PDF ke file
        pdfDoc.pipe(writeStream);
        pdfDoc.end();

        // Pastikan proses file selesai
        writeStream.on('finish', () => {
            // Kirim file PDF setelah selesai
            res.download(filePath, 'pendaftar.pdf', (err) => {
                if (err) {
                    console.error('Error during download:', err);
                    return res.status(500).json({ error: 'Gagal mengunduh file PDF' });
                }

                // Hapus file setelah diunduh
                fsSync.unlinkSync(filePath);
            });
        });

        // Tangani error pada writeStream
        writeStream.on('error', (error) => {
            console.error('Error writing PDF file:', error);
            res.status(500).json({ error: 'Terjadi kesalahan saat membuat PDF' });
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membuat PDF' });
    }
});

// download zip gambar 
router.get('/download-zip/:nik', (req, res) => {
    const { nik } = req.params; // Ambil NIK dari parameter URL
    const outputPath = path.join(__dirname, `${nik}.zip`); // Nama file ZIP berdasarkan NIK
    const output = fsSync.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Tangani event ketika arsip selesai dibuat
    output.on('close', () => {
        console.log(`ZIP file created: ${archive.pointer()} total bytes`);

        // Kirim file ZIP ke pengguna
        res.download(outputPath, `${nik}.zip`, (err) => {
            if (err) {
                console.error('Error during download:', err);
            } else {
                // Hapus file ZIP setelah selesai diunduh
                fsSync.unlinkSync(outputPath);
                console.log(`File ZIP ${nik}.zip telah dihapus setelah diunduh`);
            }
        });
    });

    // Tangani error
    archive.on('error', (err) => {
        throw err;
    });

    // Hubungkan stream dengan file output
    archive.pipe(output);

    // Tambahkan folder berdasarkan NIK ke arsip
    const folderPath = path.join(__dirname, '../../public/imagesPendaftar', nik); // Path folder berdasarkan NIK
    console.log(folderPath)
    if (fsSync.existsSync(folderPath)) {
        archive.directory(folderPath, nik); // Tambahkan folder ke ZIP
    } else {
        return res.status(404).send('Folder tidak ditemukan.');
    }

    // Panggil finalize untuk menyelesaikan pembuatan ZIP
    archive.finalize();
});

// sejarah
router.get('/profile/sejarah', async (req, res) => {
    res.render('pages/user/sejarah', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Sejarah',
        data: req.body,
        listNavbar,
    });
});



// Route profile
router.get('/profile', async (req, res) => {
    res.render('pages/user/profile', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Halaman profile',
        listNavbar,
    });
});

// Route untuk psb
router.get('/psb', async (req, res) => {
    res.render('pages/user/psb', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Halaman PSB',
        listNavbar,
    });
});

// Route untuk FAQ
router.get('/faq', async (req, res) => {
    res.render('pages/user/faq', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Halaman FAQ',
        listNavbar,
    });
});

// Route untuk FAQ
router.get('/kemahadan', async (req, res) => {
    res.render('pages/user/kemahadan', {
        layout: 'layouts/main-ejs-layouts',
        title: "Halaman Kema'hadan",
        listNavbar,
    });
});



// Logout route
router.get('/logout', (req, res) => {
    // Destroy all sessions
    req.session.destroy((err) => {
        if (err) {
            console.error('Error while destroying session:', err);
            return res.status(500).send('Failed to log out');
        }

        // Optionally, clear the session cookie if your session store is using cookies
        res.clearCookie('connect.sid'); // Ensure the session cookie is cleared

        // Redirect to the home page or login page after logging out
        res.redirect('/login-admin'); // Redirect to the login page or home page
    });
});






export default router;
