import { DataTypes } from 'sequelize';
import db from '../config/database.js'; // Pastikan path database yang benar

const Ustad = db.define('ustad_ustadzah', {
    nama_ustad_ustadzah: {
        type: DataTypes.STRING(30),   // Menggunakan STRING dengan panjang 30 karakter untuk nama
        allowNull: false,             // Kolom wajib
        trim: true,                   // Trim untuk menghilangkan spasi ekstra
    },
    posisi: {
        type: DataTypes.STRING(30),   // Menggunakan STRING dengan panjang 30 karakter untuk nama
        allowNull: false,             // Kolom wajib
        trim: true,             // Kolom wajib
    },
    img_ustad_ustadzah: {
        type: DataTypes.STRING(255),  // Menggunakan STRING untuk thumbnail URL/path
        allowNull: true,              // Kolom opsional
        trim: true,                   // Trim untuk menghilangkan spasi ekstra
    },
}, {
    freezeTableName: true,  // Nama tabel sesuai dengan model
    timestamps: false,      // Tidak menggunakan timestamp otomatis (createdAt, updatedAt)
});

export default Ustad;
