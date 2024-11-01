// module mongoose
import mongoose from "mongoose";


// scema pendaftaran
export const Pendaftaran = mongoose.model('SISWA', {
    nisn: {
        type: String,
        required: true,
        trim: true,
    },
    nik: {
        type: String,
        required: true,
        trim: true,
    },
    nama_lengkap: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 30,
    },
    jenis_kelamin: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    usia: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 2,
    },
    tempat_tanggal_lahir: {
        tempat_lahir: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 30,
        },
        tanggal_lahir: {
            type: String,
            required: true,
            trim: true,
        },
    },
    alamat: {
        desa: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        rw: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2,
        },
        rt: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2,
        },
        kecamatan: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        kabupaten: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        provinsi: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
    },
    anak_ke: {
        type: String,
        required: true,
        trim: true,
    },
    jumlah_saudara: {
        type: String,
        required: true,
        trim: true,
    },
    nomor_telephone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 13,
    },
    alumni_sd: {
        type: String,
        required: true,
        trim: true,
    },
    alamat_sekolah_asal: {
        type: String,
        required: true,
        trim: true,
    },
    nama_lengkap_ayah: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    nama_lengkap_ibu: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    nama_lengkap_wali: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    kode_pos: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5,
    },
    foto_formal: {
        type: String,
        required: false,
        lowercase: true,
    },
    akta_kelahiran: {
        type: String,
        required: false,
        lowercase: true,
    },
    kartu_keluarga: {
        type: String,
        required: false,
        lowercase: true,
    },
    fc_ktp: {
        type: String,
        required: false,
        lowercase: true,
    },
    kip_kis: {
        type: String,
        required: false,
        lowercase: true,
    },
});