import { check } from "express-validator";

// validator input pendaftar
export const validatorResultPendaftar = [
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
        .isLength({ max: 2 }).withMessage('anak ke tidak valid!')
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
        .isLength({ max: 2 }).withMessage('jumlah saudara tidak valid!')
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
        .isLength({ max: 13 }).withMessage('nomor telephone tidak boleh lebih dari 13 digit!')
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
        .isLength({ max: 5 }).withMessage('kode pos tidak boleh lebih dari 5 digit!')
        .bail()
        .custom(value => {
            if (value < 1) {
                throw new Error('kode pos harus lebih dari 0!');
            }
            return true; // Validasi berhasil
        }),

];

// login
export const validatorLogin = [
    check('username', 'Username harus berisi huruf!').isAlpha('en-US'),
    check('password', 'Password harus berisi angka dan huruf!').matches(/^[a-zA-Z0-9 ]+$/),
]

// berita

export const validatorUploadBerita = [
    check('content', 'content harus berisi huruf, angka, dan simbol').matches(/^[\s\S]+$/)
]

export const validatorUbahBerita = [
    check('content', 'content harus berisi huruf, angka, dan simbol').matches(/^[\s\S]+$/),
]

// username 

export const validatorUbahUsername = [
    check('usernameLama', 'username lama tidak valid').isAlpha('en-US'),
    check('password', 'password tidak valid').matches(/^[a-zA-Z0-9 ]+$/),
    check('usernameBaru', 'username baru tidak valid').isAlpha('en-US'),
];

// password
export const validatorUbahPassword = [
    check('username', 'username tidak valid').isAlpha('en-US'),
    check('passwordLama', 'password lama tidak valid').matches(/^[a-zA-Z0-9 ]+$/),
    check('passwordBaru', 'password baru tidak valid').matches(/^[a-zA-Z0-9 ]+$/),
    check('konfirmasiPassword', 'konfirmasi password tidak valid').matches(/^[a-zA-Z0-9 ]+$/),
]

// alumni

export const validatorAlumni = [
    check('nama_alumni', 'Nama alumni hanya boleh berisi huruf dan spasi').matches(/^[a-zA-Z\s]+$/).withMessage('Nama alumni tidak valid'),
    check('angkatan', 'Angkatan hanya boleh berisi angka').isNumeric().withMessage('Angkatan harus berupa angka'),
    check('pesan', 'Pesan hanya boleh berisi huruf dan angka')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('Pesan mengandung karakter yang tidak valid')
]

// ustad ustadzah
export const validatorUstadUstadzah = [
    check('nama_ustad_ustadzah', 'Nama ustad dan ustadzah hanya boleh berisi huruf dan spasi').matches(/^[a-zA-Z\s]+$/).withMessage('Nama ustad dan ustadzah tidak valid'),
    check('posisi', 'Posisi hanya boleh berisi huruf dan angka')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('Posisi mengandung karakter yang tidak valid')
]