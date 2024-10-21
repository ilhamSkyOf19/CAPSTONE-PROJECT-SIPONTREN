import { check } from "express-validator";


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
    check('tempat_tanggal_lahir.tempat_lahir', 'tempat harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }), // cek tempat lahir
    check('tempat_tanggal_lahir.tanggal_lahir', 'tanggal lahir tidak valid').isDate(),  // cek tanggal lahir
    check('alamat.desa', 'desa harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }), // cek alamat desa
    check('alamat.rw')  // cek alamat rw
        .notEmpty().withMessage('rw harus diisi!')
        .bail()
        .isInt().withMessage('rw harus berupa angka dan maksimal 100!')
        .bail()
        .isLength({max: 3}).withMessage('rw tidak boleh lebih dari 3 digit!')
        .bail()
        .custom(value => {
            if (value < 1) {
                throw new Error('rw harus lebih dari 0!');
            }
            return true; // Validasi berhasil
        }),
    check('alamat.rt')  // cek alamat rt
        .notEmpty().withMessage('rt harus diisi!')
        .bail()
        .isInt({ max: 100 }).withMessage('rt harus berupa angka ')
        .bail()
        .isLength({max: 3}).withMessage('rt tidak boleh lebih dari 3 digit!')
        .bail()
        .custom(value => {
            if (value < 1) {
                throw new Error('rt harus lebih dari 0!');
            }
            return true; // Validasi berhasil
        }),
    check('alamat.kecamatan', 'kecamatan harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }),   // cek alamat kecamatan
    check('alamat.kabupaten', 'kabupaten harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }),   // cek alamat kabupaten
    check('alamat.provinsi', 'provinsi harus berisi huruf!').isAlpha('en-US', { ignore: ' ' }),     // cek alamat provinsi  
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
