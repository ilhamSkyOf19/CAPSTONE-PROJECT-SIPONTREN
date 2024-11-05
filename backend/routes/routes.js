import { check, body, validationResult } from 'express-validator';
import multer from 'multer';
import { validatorResult, capitalizeWords, deleteBeritaById, deletePendaftarById } from '../utils/validator.js';
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




router.get('/', async (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // format tanggal

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


// UBAHH KE MYSQL!!!


// Halaman data-pendaftar
router.get('/data-pendaftar', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    let dataPendaftar = await Pendaftaran.find();
    dataPendaftar = dataPendaftar.map(dataPendaftar => {
        if (dataPendaftar._doc && typeof dataPendaftar._doc === 'object') {
            for (let key in dataPendaftar._doc) {
                if (typeof dataPendaftar._doc[key] === 'string' && key !== 'email' && key !== 'asal_sekolah' && key !== 'ijazah' && key !== 'kk') {
                    dataPendaftar._doc[key] = capitalizeWords(dataPendaftar._doc[key]);
                }
            }
        }
        return dataPendaftar._doc;
    });
    res.render('pages/admin/daftar/data-pendaftar', {
        layout: 'layouts/main-ejs-layouts',
        title: 'data pendaftar',
        dataPendaftar,
        dataUsername,
        msg: req.flash('msg'),
    });
});

// Halaman ubah data pendaftar
router.get('/ubah-data-pendaftar/:id', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    try {
        let id = req.params.id;
        let data = await Pendaftaran.findById(id); 
        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-pendaftar');
        }

        // Lakukan kapitalisasi untuk semua string kecuali 'email' dan 'asal_sekolah'
        for (let key in data._doc) {
            if (typeof data._doc[key] === 'string' && key !== 'email' && key !== 'asal_sekolah' && key !== 'foto_formal' && key !== 'akta_kelahiran' && key !== 'kartu_keluarga' && key !== 'fc_ktp' && key !== 'kip_kis') {
                data._doc[key] = capitalizeWords(data._doc[key]);
            } else if (typeof data._doc[key] === 'object') {
                for (let subKey in data._doc[key]) {
                    if (typeof data._doc[key][subKey] === 'string') {
                        data._doc[key][subKey] = capitalizeWords(data._doc[key][subKey]);
                    }
                }
            }
        }
        const user = await User.findOne({ _id: req.session.loggedIn });
        const dataUsername = user.username;
        // Render halaman ubah-data-pendaftar
        res.render('pages/admin/daftar/ubah-data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Pendaftar',
            data,
            dataUsername,
            dataFile: '',
        });
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error(err);
        res.redirect('/data-pendaftar');
    }
});


// PUT ubah data pendaftar
router.put('/ubah-data', (req, res, next) => {
    console.log('Request body:', req.body); // Menampilkan semua data yang dikirim
    console.log('Files:', req.files); // Menampilkan file yang dikirim

    // Pertama, jalankan Upload middleware untuk menangani file
    Upload2(req, res, async function (error) {
        let dataPendaftar = await Pendaftaran.findById(req.body._id);
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

            return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form',
                errors: [{ msg: errorMessage }],
                data: req.body,
                dataFile: dataPendaftar,
                msg: req.flash('msg'),
            });
        }

        // Jika file upload berhasil, lanjutkan ke middleware validasi berikutnya
        next();
    });
}, async (req, res, next) => {
    if(req.files) {
        FileValidator.checkFileType2(req, res, next, 'pages/admin/daftar/ubah-data-pendaftar');
    } else {
        next();
    }
}, validatorResult, async (req, res) => {
    const errors = validationResult(req);
    let dataPendaftar = await Pendaftaran.findById(req.body._id);

    // Ambil NIK lama dan NIK baru
    const oldNik = req.body.old_nik || ''; // Ambil NIK lama dari form
    const nik = req.body.nik || ''; // Ambil NIK baru dari form
    
    if (!errors.isEmpty()) {
        const fileFields = ['foto_formal', 'akta_kelahiran', 'kartu_keluarga', 'fc_ktp', 'kip_kis'];
        const uploadedFiles = req.files || {};
    
        try {
            for (const field of fileFields) {
                const file = uploadedFiles?.[field]?.[0] || null;
                if (file) {
                    await fs.unlink(file.path);
                }
            }
    
            const folder = `public/imagesPendaftar/${oldNik}`;
            if (folder) {
                await fs.rmdir(folder);
            }
        } catch (err) {
            console.error('Error while deleting files or directory:', err);
        }
    
        return res.render('pages/admin/daftar/ubah-data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'ubah data pendaftar',
            errors: errors.array(),
            data: req.body,
            dataFile: dataPendaftar,
            msg: req.flash('msg'),
        });
    } else {
        try {
            // Cek jika NIK berubah, rename folder dari oldNik ke nik
            if (nik !== oldNik) {
                const oldDir = path.join('public/imagesPendaftar', oldNik);
                const newDir = path.join('public/imagesPendaftar', nik);

                // Rename folder old_nik ke nik baru
                await fs.rename(oldDir, newDir);
                console.log(`Folder renamed from ${oldNik} to ${nik}`);
            }

            // Proses file yang diupload
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

            if (req.files) {
                try {
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

                    fotoFormal = await processFile('foto_formal', fotoFormalOld);
                    aktaKelahiran = await processFile('akta_kelahiran', aktaKelahiranOld);
                    kartuKeluarga = await processFile('kartu_keluarga', kartuKeluargaOld);
                    fcKtp = await processFile('fc_ktp', fcKtpOld);
                    kipKis = await processFile('kip_kis', kipKisOld);

                } catch (err) {
                    console.error("Error processing files:", err);
                    return res.status(500).send("Error processing files");
                }
            }

            await Pendaftaran.updateOne(
                { _id: req.body._id },
                {
                    $set: {
                        nisn: req.body.nisn,
                        nik: req.body.nik,
                        nama_lengkap: req.body.nama_lengkap,
                        jenis_kelamin: req.body.jenis_kelamin,
                        usia: req.body.usia,
                        "tempat_tanggal_lahir.tempat_lahir": req.body.tempat_tanggal_lahir.tempat_lahir,
                        "tempat_tanggal_lahir.tanggal_lahir": req.body.tempat_tanggal_lahir.tanggal_lahir,
                        "alamat.desa": req.body.alamat.desa,
                        "alamat.rw": req.body.alamat.rw,
                        "alamat.rt": req.body.alamat.rt,
                        "alamat.kecamatan": req.body.alamat.kecamatan,
                        "alamat.kabupaten": req.body.alamat.kabupaten,
                        "alamat.provinsi": req.body.alamat.provinsi,
                        asal_sekolah: req.body.asal_sekolah,
                        nomor_telephone: req.body.nomor_telephone,
                        nomor_whatsapp: req.body.nomor_whatsapp,
                        email: req.body.email,
                        kode_pos: req.body.kode_pos,
                        status_anak: req.body.status_anak,
                        berat_badan: req.body.berat_badan,
                        tinggi_badan: req.body.tinggi_badan,
                        foto_formal: fotoFormal,
                        akta_kelahiran: aktaKelahiran,
                        kartu_keluarga: kartuKeluarga,
                        fc_ktp: fcKtp,
                        kip_kis: kipKis,
                    }
                }
            );

            req.flash('msg', 'Data berhasil diubah!');
            res.redirect('/data-pendaftar');
        } catch (error) {
            let errorMessage;
            if (error.name === 'ValidationError') {
                errorMessage = Object.values(error.errors)
                    .map(err => err.message)
                    .join(', ');
            } else {
                errorMessage = 'Terjadi kesalahan saat menyimpan data ke database!';
            }

            return res.render('pages/admin/daftar/ubah-data-pendaftar', {
                layout: 'layouts/main-ejs-layouts',
                title: 'Form',
                errors: [{ msg: errorMessage }],
                data: req.body,
                dataFile: dataPendaftar,
                msg: req.flash('msg'),
            });
        }
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
    
        // Jika ada error dari validasi, render kpages/home/embali form dengan pesan error
        return res.render('pages/admin/berita/form-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'form-berita',
            errors: errors.array(),
            data: req.body,
        });
    } else {        
        const { title, content } = req.body;
        const thumbnail = req.file ? req.file.filename : null;
      
        const berita = new Berita({
            title,
            content,
            thumbnail
        });
      
        try {
            await Berita.insertMany([berita]);
            res.redirect('/');
        } catch (err) {
            res.status(500).send(err);
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
        let data = await Berita.findById(id);
        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/data-pendaftar');
        }
        res.render('pages/admin/berita/ubah-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'form ubah berita',
            dataUsername,
            data,
            dataFile: '',
        });
    } catch {
         // Tangani error jika terjadi masalah
         console.error(err);
         res.redirect('/data-pendaftar');
    }
   
});



// Ubah data berita
const uploaderUbahBerita = new FileSingleUploader('public/imageBerita', maxSize, 'thumbnail');
router.put('/form-berita', (req, res, next) => {
    console.log('Request body:', req.body); // Menampilkan semua data yang dikirim
    console.log('Files:', req.files); // Menampilkan file yang dikirim

    // Jalankan Upload middleware untuk menangani file
    uploaderUbahBerita(req, res, async (error) => {
        let dataBerita = await Berita.findById(req.body._id);
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
}, async (req, res) => {
    const errors = validationResult(req);
    const dataBerita = await Berita.findById(req.body._id);

    if (!errors.isEmpty()) {
        return res.render('pages/admin/berita/ubah-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'ubah data pendaftar',
            errors: errors.array(),
            data: req.body,
            msg: req.flash('msg'),
            dataFile: dataBerita,
        });
    }

    try {
        let thumbnailOld = req.body.thumbnailOld || '';
        let thumbnail = req.body.thumbnail || '';
    
        if (req.files) {
            try {
                const processFile = async (field, oldFile) => {
                    if (req.files[field]) {
                        const newFileName = path.basename(req.files[field][0].path);
                        if (oldFile) {
                            const oldFilePath = path.join('public/imageBerita/', oldFile);
                            await fs.promises.unlink(oldFilePath);
                            console.log(`Old ${field} file removed: ${oldFilePath}`);
                        }
                        return newFileName;
                    }
                    return oldFile; // Mengembalikan file lama jika tidak ada file baru
                };
                thumbnail = await processFile('thumbnail', thumbnailOld);
            } catch (err) {
                console.error("Error processing files:", err);
                return res.status(500).send("Error processing files");
            }
        }
    
        await Pendaftaran.updateOne(
            { _id: req.body._id },
            {
                $set: {
                    title: req.body.title,
                    content: req.body.content,
                    thumbnail: thumbnail, // Gunakan thumbnail yang diproses
                }
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
});



// router detail berita 
router.get('/detail-berita/:id', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // format tanggal
        let id = req.params.id;
        let data = await Berita.findById(id); // Tidak perlu callback di sini

        // Jika data tidak ditemukan, arahkan ke halaman data pendaftar
        if (!data) {
            return res.redirect('/');
        }
        const user = await User.findOne({ _id: req.session.loggedIn });
        if (user) {
            const dataUsername = user.username;
              // Render halaman ubah-data-pendaftar
            res.render('pages/admin/berita/detail-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'detail-berita',
                data,
                dataUsername,
                today,
            });
        } else {
              // Render halaman ubah-data-pendaftar
            res.render('pages/admin/berita/detail-berita', {
                layout: 'layouts/main-ejs-layouts',
                title: 'detail-berita',
                data,
                today,
            });
        }
      
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error(err);
        res.redirect('/');
    }
})


// daftar berita 
router.get('/daftar-berita', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-admin');
    }
    const today = new Date().toISOString().split('T')[0]; // format tanggal
    const berita = await Berita.find({ date: { $gte: today } }).sort({ date: -1 });
    const user = await User.findOne({ _id: req.session.loggedIn });
    const dataUsername = user.username;
    return res.render('pages/admin/berita/daftar-berita', {
        layout:'layouts/main-ejs-layouts',
        title: 'daftar-berita',
        msg: req.flash('msg'),
        berita,
        dataUsername,
        today,
    });
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



// Hapus data pendaftar
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



// Logout route
router.get('/logout', (req, res) => {
    // Destroy all sessions
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Failed to logout');
        }
        // Optionally, redirect to login or home page
        res.redirect('/'); // Redirect to login page after logout
    });
});






export default router;
