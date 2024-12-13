import { DataTypes } from 'sequelize';
import db from '../config/database.js'; // Pastikan path database yang benar

const Alumni = db.define('alumni', {
  nama_alumni: {
    type: DataTypes.STRING(30),   // Menggunakan STRING dengan panjang 30 karakter untuk nama
    allowNull: false,             // Kolom wajib
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  angkatan: {
    type: DataTypes.INTEGER,      // Menggunakan INTEGER untuk angkatan
    allowNull: false,             // Kolom wajib
  },
  pesan: {
    type: DataTypes.TEXT,         // Menggunakan TEXT untuk pesan
    allowNull: true,              // Kolom opsional
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  imgAlumni: {
    type: DataTypes.STRING(255),  // Menggunakan STRING untuk thumbnail URL/path
    allowNull: true,              // Kolom opsional
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
}, {
  freezeTableName: true,  // Nama tabel sesuai dengan model
  timestamps: false,      // Tidak menggunakan timestamp otomatis (createdAt, updatedAt)
});

export default Alumni;
