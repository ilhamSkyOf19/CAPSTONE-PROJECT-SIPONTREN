import { check, body, validationResult } from 'express-validator';
import multer from 'multer';
import { validatorResult, capitalizeWords } from '../utils/validator.js';
import express from 'express';
import { Upload, Upload2 } from '../middleware/uploadFile.js';
import FileValidator from '../middleware/checkFile.js';
import { UploadBerita } from '../middleware/uploadFile.js';
import path from 'node:path';
import fs from 'fs/promises';
import { Pendaftaran } from '../models/pendaftaran.js';
import { Berita } from '../models/skemaBerita.js';
import { User } from '../models/skemaLogin.js';
import csrf from 'csrf';

// konfigurasi crsf
const csrfProtection = new csrf();
const secret = csrfProtection.secretSync();

// router
const router = express.Router();

// Middleware untuk menangani rute yang tidak ditemukan (404)
router.get(' ',(req, res, next) => {
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'Halaman yang Anda cari tidak ditemukan!',
        layout: 'layouts/main-ejs-layouts'
    });
});


// Halaman home pendaftaran
router.get('/', async (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // format tanggal
    let dataUsername = ''; // Variabel untuk menyimpan nama pengguna, default-nya kosong

    if (req.session.loggedIn) {
        try {
            const user = await User.findOne({ _id: req.session.loggedIn }); // Ambil data pengguna jika ada userId
            if (user) {
                dataUsername = user.username; // Jika pengguna ditemukan, simpan username
            }
        } catch (error) {
            console.error(error);
        }
    }
    const berita = await Berita.find({ date: { $gte: today } }).sort({ date: -1 });
    return res.render('index', {
        layout:'layouts/main-ejs-layouts',
        title: 'halaman utama',
        dataUsername,
        berita,
        today,
    });
});

// login pendaftaran
router.get('/login-pendaftaran', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/form-pendaftaran');
    };
    if (req.session.userId) {
        return res.redirect('/data-pendaftar');
    }
    const token = csrfProtection.create(secret);
    return res.render('login-pendaftaran', {
        layout: 'layouts/main-ejs-layouts',
        title: 'form pendaftaran',
        data: req.body,
        csrfToken: token, // kirim token crsf ke view
        msg: req.flash('msg'),
    });
});

// form login pendaftaran
router.post('/login-pendaftaran', 
    body('username').custom(async (value) => {
        const username = await User.findOne({ username: value });
        if (!username) {
            throw new Error('Username tidak terdaftar!');
        }
        return true;
    }),
    [
        // cek validasi untuk username dan password
        check('username', 'username harus berisi huruf!').isAlpha('en-US'),
        check('password', 'password berisi angka dan huruf').matches(/^[a-zA-Z0-9 ]+$/)
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('login-pendaftaran', {
                layout: 'layouts/main-ejs-layouts',
                title: 'halaman login',
                errors: errors.array(),
                data: req.body,
                csrfToken: req.body._csrf,
            });
        } else {
            try {
                const { username, password, _csrf } = req.body; // Ambil username dan password dari req.body
                // cek token crsf
                if (!csrfProtection.verify(secret, _csrf)) {
                    return res.status(403).send('CSRF token tidak valid!');
                }
                const user = await User.findOne({ username }); // Temukan pengguna berdasarkan username
                let errorMsg;

                if (!user) {
                    errorMsg = 'Username tidak terdaftar!';
                    return res.render('login-pendaftaran', {
                        title: 'halaman login',
                        layout: 'layouts/main-ejs-layouts',
                        errors: [{ msg: errorMsg }],
                        data: req.body,
                        csrfToken: req.body._csrf
                    });
                }

                const isPasswordValid = await user.comparePassword(password); // Gunakan instance user untuk membandingkan password
                if (!isPasswordValid) {
                    errorMsg = 'Terjadi kesalahan password!';
                    return res.render('login-pendaftaran', {
                        layout: 'layouts/main-ejs-layouts',
                        title: 'halaman login',
                        errors: [{ msg: errorMsg }],
                        data: req.body,
                        csrfToken: req.body._csrf
                    });
                };


            // Regenerate session untuk mengacak session ID
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Error regenerating session:', err);
                        return res.status(500).send('Internal server error');
                    }
                });

                req.session.loggedIn = user._id;
                req.flash('msg', 'Berhasil masuk');
                res.redirect('/form-pendaftaran');
            } catch (error) {
                console.log(error);
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
        console.log(req.body)
        res.render('register', {
            layout: 'layouts/main-ejs-layouts',
            title: 'register',
            errors: errors.array(),
            data: req.body,
        })
    } else {
        const { username, password } = req.body;
    
        try {
            const user = new User({ username, password });
            await user.save();
            req.flash('msg', 'Username Berhasil Ditambah');
            res.redirect('/login-pendaftaran');
        } catch (error) {
            console.log(error);
            res.status(500).send('Error logging in');
        }
    }
});



// form pendaftaran
router.get('/form-pendaftaran', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login-pendaftaran'); // Jika belum login, redirect ke login
    }
    if (req.session.userId) {
        return res.redirect('/data-pendaftar');
    }
    res.render('form-pendaftaran', {
        title: 'halaman pendaftar',
        layout: 'layouts/main-ejs-layouts',
        msg: req.flash('msg'),
        data: req.body,
    });
});

// Form pendaftaran
// Router POST untuk data pendaftar
router.post('/data-pendaftar', [
    (req, res, next) => {
        // Pertama, jalankan Upload middleware untuk menangani file
        Upload(req, res, async function (error) {
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
                return res.render('form-pendaftaran', {
                    layout: 'layouts/main-ejs-layouts',
                    title: 'halaman pendaftaran',
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
        await FileValidator.checkFileType(req, res, next, 'form-pedaftaran');
    }, 
    // Validasi field NIK dan NISN menggunakan express-validator
    body('nik').custom(async (value) => {
        const duplikatNik = await Pendaftaran.findOne({ nik: value });
        if (duplikatNik) {
            throw new Error('Data NIK sudah terkirim!');
        }
        return true;
    }),
    body('nisn').custom(async (value) => {
        const duplikatNisn = await Pendaftaran.findOne({ nisn: value });
        if (duplikatNisn) {
            throw new Error('Data NISN sudah terkirim!');
        }
        return true;
    }),
    validatorResult
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Memeriksa dan menghapus semua file jika ada error
        const uploadedFiles = req.files;
    
        try {
            // Iterasi melalui semua file yang di-upload
            for (const [key, files] of Object.entries(uploadedFiles)) {
                const file = files[0]; // Ambil file pertama dari array file (jika ada)
                if (file) {
                    await fs.unlink(file.path); // Hapus file
                }
            }
            fs.rmdir(`images/${req.body.nik}`);
        } catch (err) {
            console.error('Error while deleting files or directory:', err);
            // Anda dapat memberikan pesan kesalahan yang sesuai kepada pengguna jika diperlukan
        }
    
        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('form-pendaftaran', {
            layout: 'layouts/main-ejs-layouts',
            title: 'halaman pendaftaran',
            errors: errors.array(),
            data: req.body,
        });
    } else {
        try {
            // Gabungkan req.body dengan file jika ada
            const finalData = {
                ...req.body,
            };
    
            // Iterasi untuk menggabungkan file ke finalData
            for (const [key, files] of Object.entries(req.files)) {
                const file = files[0]; // Ambil file pertama dari array file (jika ada)
                if (file) {
                    finalData[key] = file.filename; // Tambahkan nama file ke finalData
                }
            }
    
            // Set session
            req.session.userId = true;
    
            await Pendaftaran.insertMany(finalData); // Menggunakan async/await
            req.flash('msg', 'Data Berhasil Ditambah');
            res.redirect('/form-pendaftaran');
        } catch (error) {
            console.log(error);
            let errorMessage = 'terjadi kesalahan!';
            // Tampilkan form kembali dengan pesan error dan data input sebelumnya
            return res.render('form-pendaftaran', {
                layout: 'layouts/main-ejs-layouts',
                title: 'halaman pendaftaran',
                errors: [{ msg: errorMessage }],
                data: req.body,
            });
        }
    }    
});




// Halaman data-pendaftar
router.get('/data-pendaftar', async (req, res) => {
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
    res.render('data-pendaftar', {
        layout: 'layouts/main-ejs-layouts',
        title: 'data pendaftar',
        dataPendaftar,
        msg: req.flash('msg'),
    });
});

// Halaman ubah
router.get('/ubah-data-pendaftar/:id', async (req, res) => {
    try {
        let id = req.params.id;
        let data = await Pendaftaran.findById(id); // Tidak perlu callback di sini

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

        // Render halaman ubah-data-pendaftar
        res.render('ubah-data-pendaftar', {
            layout: 'layouts/main-ejs-layouts',
            title: 'Ubah Data Pendaftar',
            data,
            dataFile: '',
        });
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error(err);
        res.redirect('/data-pendaftar');
    }
});


// PUT
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

            return res.render('ubah-data-pendaftar', {
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
        FileValidator.checkFileType2(req, res, next, 'ubah-data-pendaftar');
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
    
            const folder = `images/${oldNik}`;
            if (folder) {
                await fs.rmdir(folder);
            }
        } catch (err) {
            console.error('Error while deleting files or directory:', err);
        }
    
        return res.render('ubah-data-pendaftar', {
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
                const oldDir = path.join('images', oldNik);
                const newDir = path.join('images', nik);

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
                                const oldFilePath = path.join('images', nik, oldFileField);
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

            return res.render('ubah-data-pendaftar', {
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
router.get('/form-berita', (req, res) => {
    res.render('form-berita', {
        layout: 'layouts/main-ejs-layouts',
        title: 'form berita',
        data: req.body,
    });
  });


// Route untuk menambah berita ke database
router.post('/form-berita', [
    (req, res, next) => {
        // Pertama, jalankan Upload middleware untuk menangani file
        UploadBerita(req, res, function (error) {
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
                return res.render('form-berita', {
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
        await FileValidator.checkFileType3(req, res, next, 'form-berita');
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
        console.log('Uploaded File:', req.file); 
    
        // Jika ada error dari validasi, render kembali form dengan pesan error
        return res.render('form-berita', {
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


        // Render halaman ubah-data-pendaftar
        res.render('detail-berita', {
            layout: 'layouts/main-ejs-layouts',
            title: 'detal-berita',
            data,
            today,
        });
    } catch (err) {
        // Tangani error jika terjadi masalah
        console.error(err);
        res.redirect('/data-pendaftar');
    }
})


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


// Hapus data pendaftar
router.delete('/data-pendaftar/:id', async (req, res) => {
    await Pendaftaran.deleteOne({ _id: req.params.id });
    req.flash('msg', 'Data berhasil dihapus!');
    res.redirect('/data-pendaftar');
});

export default router;
