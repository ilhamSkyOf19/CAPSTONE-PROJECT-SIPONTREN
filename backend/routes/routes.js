import { check, body, validationResult } from 'express-validator';
import multer from 'multer';
import { validatorResult, capitalizeWords, deleteBeritaById } from '../utils/validator.js';
import express from 'express';
import { Upload, Upload2 } from '../middleware/uploadFile.js';
import FileValidator from '../middleware/checkFile.js';
import { FileSingleUploader } from '../middleware/uploadFile.js';
import path from 'node:path';
import fs from 'fs/promises';
import  Pendaftaran  from '../models/pendaftaran.js';
import  Berita  from '../models/skemaBerita.js';
import User from '../models/skemaLogin.js';
import csrf from 'csrf';
import { Sequelize } from 'sequelize';
import argon2 from 'argon2';

// konfigurasi crsf
const csrfProtection = new csrf();
const secret = csrfProtection.secretSync();

// router
const router = express.Router();

const today = new Date().toISOString().split('T')[0]; // Format tanggal




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
    const berita = await Berita.findAll({
        where: {
            date: {
                [Sequelize.Op.gte]: today, // Mengambil berita yang memiliki tanggal >= hari ini
            },
        },
        order: [['date', 'DESC']], // Urutkan berita berdasarkan tanggal terbaru
    });

    return res.render('pages/home/index', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Halaman Utama',
        dataUsername,
        berita,
        today,
    });
});


router.get('/login-admin', (req, res) => {
    return res.render('pages/admin/login/login-admin', {
        layout: 'layouts/main-ejs-layouts',
        title: 'Form Pendaftaran',
        data: req.body,
        msg: req.flash('msg'),
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
    [
        // Validasi username dan password
        check('username', 'Username harus berisi huruf!').isAlpha('en-US'),
        check('password', 'Password harus berisi angka dan huruf!').matches(/^[a-zA-Z0-9 ]+$/),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/admin/login/login-admin', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Halaman Login',
                errors: errors.array(),
                data: req.body,
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


// register 
router.get('/register', (req, res) => {
    res.render('register', {
        title: 'register',
        layout: 'layouts/main-ejs-layouts',
        data: req.body,
    });
});

// Rute untuk registrasi
router.post('/register', [
    check('username', 'username harus berisi huruf!').isAlpha('en-US'),
    check('password', 'password berisi angka dan huruf').matches(/^[a-zA-Z0-9 ]+$/)
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('register', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Register',
            errors: errors.array(),
            data: req.body,
        });
    }

    const { username, password } = req.body;

    try {
        // Cek apakah username sudah terdaftar
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.render('register', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Register',
                errors: [{ msg: 'Username sudah terdaftar!' }],
                data: req.body,
            });
        }

        // Membuat pengguna baru
        const newUser = await User.create({ 
            username, 
            password, // Password otomatis di-hash oleh Sequelize hook
        });

        req.flash('msg', 'Username berhasil ditambahkan');
        res.redirect('/login'); // Redirect ke halaman login setelah registrasi berhasil
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan saat registrasi.');
    }
});



// form pendaftaran
router.get('/form-pendaftaran', (req, res) => {
    res.render('pages/user/form-pendaftaran', {
        title: 'halaman pendaftar',
        layout: 'layouts/main-ejs-layouts',
        msg: req.flash('msg'),
        data: req.body,
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
                });
            }
            next(); // Jika tidak ada error, lanjut ke middleware berikutnya
        });
    },
    async (req, res, next) => {
        // Validasi tipe file di sini dengan checkFileType, arahkan ke 'index' jika error
        await FileValidator.checkFileType(req, res, next, 'pages/user/form-pendaftaran');
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
    validatorResult
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
            fs.rmdir(`public/imagesPendaftar/${req.body.nik}`);
        } catch (err) {
            console.error('Error while deleting files or directory:', err);
        }

        return res.render('pages/user/form-pendaftaran', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Halaman Pendaftaran',
            errors: errors.array(),
            data: req.body,
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

        // Ambil semua data pendaftar dari MySQL
        let dataPendaftar = await Pendaftaran.findAll();

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
        });
    } catch (err) {
        console.error(err);
        req.flash('msg', 'Terjadi kesalahan saat mengambil data pendaftar.');
        res.redirect('/');
    }
});

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
router.put('/ubah-data', (req, res, next) => {
    console.log('Request body:', req.body); // Menampilkan semua data yang dikirim
    console.log('Files:', req.files); // Menampilkan file yang dikirim

    // Pertama, jalankan middleware Upload2 untuk menangani file upload
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

            let dataPendaftar = await Pendaftaran.findByPk(req.body._id); // Temukan pendaftar berdasarkan ID
            return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form Ubah Data Pendaftar',
                errors: [{ msg: errorMessage }],
                data: req.body,
                dataFile: dataPendaftar,
                msg: req.flash('msg'),
            });
        }

        next();
    });
}, async (req, res, next) => {
    if (req.files) {
        FileValidator.checkFileType2(req, res, next, 'pages/admin/daftar/ubah-data-pendaftar');
    } else {
        next();
    }
}, async (req, res) => {
    const errors = validationResult(req);
    let dataPendaftar = await Pendaftaran.findByPk(req.body._id); // Temukan pendaftar berdasarkan ID

    if (!errors.isEmpty()) {
        // Jika ada error validasi, tampilkan kembali form dengan error
        return res.render('pages/admin/daftar/ubah-data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Form Ubah Data Pendaftar',
            errors: errors.array(),
            data: req.body,
            dataFile: dataPendaftar,
            msg: req.flash('msg'),
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
        });
    }
});



// UBAHH KE MYSQL!!!


// daftar berita 
router.get('/daftar-berita', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }

    // const today = new Date().toISOString().split('T')[0]; // Format tanggal

    try {
        // Mengambil berita dengan kondisi `date >= today` dan mengurutkan berdasarkan tanggal (desc)
        const berita = await Berita.findAll({
            where: {
                date: {
                    [Sequelize.Op.gte]: today,  // Filter berita yang tanggalnya >= hari ini
                }
            },
            order: [['date', 'DESC']]  // Urutkan berdasarkan tanggal terbaru
        });

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
        uploaderberita.upload(req, res, function (error) {
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

                // Render kembali form dengan pesan error dan data input
                return res.render('pages/admin/berita/form-berita', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'form berita',
                    errors: [{ msg: errorMessage }],
                    data: req.body, // Menyimpan input sebelumnya
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
    check('title', 'Title harus berisi huruf, angka, dan simbol').matches(/^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/),
    check('content', 'content harus berisi huruf, angka, dan simbol').matches(/^[\s\S]+$/)
], async (req, res) => {
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
        });
    } else {
        const { title, content } = req.body;
        const thumbnail = req.file ? req.file.filename : null;
      
        try {
            // Simpan berita ke dalam MySQL menggunakan Sequelize
            const berita = await Berita.create({
                title,
                content,
                thumbnail
            });
            // tampilkan pesan berhasil
            req.flash('msg', 'Data berhasil diubah!');
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
        res.render('pages/admin/berita/ubah-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'form ubah berita',
            dataUsername,
            data,
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
    console.log('Request body:', req.body); // Menampilkan semua data yang dikirim
    console.log('Files:', req.files); // Menampilkan file yang dikirim
    // Jalankan Upload middleware untuk menangani file
    uploaderUbahBerita.upload(req, res, async (error) => {
        let dataBerita = await Berita.findByPk(req.body.id); // Ganti findById dengan findByPk untuk Sequelize

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

            return res.render('pages/admin/berita/ubah-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form',
                errors: [{ msg: errorMessage }],
                data: req.body,
                msg: req.flash('msg'),
                dataFile: dataBerita,
            });
        }

        // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
        next();
    });
}, async (req, res, next) => {
    if(req.file) {
        FileValidator.checkFileType3(req, res, next, 'pages/admin/berita/ubah-berita');
    } else {
        next();
    }
},
    check('title', 'Title harus berisi huruf, angka, dan simbol').matches(/^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/),
    check('content', 'content harus berisi huruf, angka, dan simbol').matches(/^[\s\S]+$/),
async (req, res) => {
    const errors = validationResult(req);
    const dataBerita = await Berita.findByPk(req.body.id); // Ganti findById dengan findByPk untuk Sequelize

    if (!errors.isEmpty()) {
        return res.render('pages/admin/berita/ubah-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'ubah data berita',
            errors: errors.array(),
            data: req.body,
            msg: req.flash('msg'),
            dataFile: dataBerita,
        });
    } else {
        try {
            let thumbnailOld = req.body.thumbnailOld || ''; // Ambil nama file lama
            let thumbnail = req.body.thumbnail || thumbnailOld; // Jika tidak ada file baru, gunakan file lama
            console.log('Thumbnail Old:', thumbnailOld);
            console.log('Thumbnail:', thumbnail);
            console.log('File Data:', req.file);
        
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
                    thumbnail: thumbnail, // Gunakan thumbnail yang baru diproses
                },
                {
                    where: { id: req.body.id } // Gantilah _id dengan id jika sesuai dengan skema Anda
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
            });
        } else {
            // Jika session tidak ada, berarti user biasa
            // Render halaman detail berita tanpa data pengguna (user biasa)
            res.render('pages/admin/berita/detail-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Detail Berita',
                data,
                today,
            });
        }
      
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error('Error fetching data:', err);
        res.redirect('/');  // Bisa juga kirim status 500 dan error message ke user
    }
});



// Hapus data pendaftar
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
