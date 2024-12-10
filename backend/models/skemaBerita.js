import { Sequelize, DataTypes } from 'sequelize';
import db from '../config/database.js'; // Pastikan path database yang benar

const Berita = db.define('berita', {
  title: {
    type: DataTypes.STRING(255),  // Menggunakan STRING untuk judul
    allowNull: false,             // Kolom wajib
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  content: {
    type: DataTypes.TEXT,         // Menggunakan TEXT untuk konten artikel
    allowNull: false,             // Kolom wajib
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  thumbnail: {
    type: DataTypes.STRING(255),  // Menggunakan STRING untuk thumbnail URL/path
    allowNull: true,              // Kolom opsional
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  kategori: {
    type: DataTypes.STRING(255),  // Menggunakan STRING untuk thumbnail URL/path
    allowNull: true,              // Kolom opsional
    trim: true,                   // Trim untuk menghilangkan spasi ekstra
  },
  tanggal_berita: {
    type: DataTypes.DATE,         // Menggunakan DATE untuk tanggal
    defaultValue: Sequelize.NOW,  // Defaultnya adalah tanggal saat ini
    allowNull: false,             // Kolom wajib
  },
  date: {
    type: DataTypes.DATE,         // Menggunakan DATE untuk tanggal
    defaultValue: Sequelize.NOW,  // Defaultnya adalah tanggal saat ini
    allowNull: false,             // Kolom wajib
  },
}, {
  freezeTableName: true,  // Nama tabel sesuai dengan model
  timestamps: false,      // Tidak menggunakan timestamp otomatis (createdAt, updatedAt)
});

export default Berita;
