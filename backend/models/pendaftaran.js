import { Sequelize, DataTypes } from 'sequelize';
import db from '../config/database.js'; // Pastikan path database yang benar

const Pendaftaran = db.define('pendaftar', {
  nisn: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    trim: true,
  },
  nik: {
    type: DataTypes.STRING(20),
    allowNull: false,
    trim: true,
  },
  nama_lengkap: {
    type: DataTypes.STRING(30),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('nama_lengkap', value.toLowerCase()); // Menyimpan dengan huruf kecil
    },
  },
  jenis_kelamin: {
    type: DataTypes.STRING(10),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('jenis_kelamin', value.toLowerCase());
    },
  },
  usia: {
    type: DataTypes.STRING(2),
    allowNull: false,
    trim: true,
  },
  tempat_lahir: {
    type: DataTypes.STRING(30),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('tempat_lahir', value.toLowerCase());
    },
  },
  tanggal_lahir: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    trim: true,
  },
  alamat: {
    type: DataTypes.TEXT, // Menggunakan TEXT untuk menampung alamat panjang
    allowNull: false,
    trim: true,
  },
  anak_ke: {
    type: DataTypes.STRING(2),
    allowNull: false,
    trim: true,
  },
  jumlah_saudara: {
    type: DataTypes.STRING(2),
    allowNull: false,
    trim: true,
  },
  nomor_telephone: {
    type: DataTypes.STRING(13),
    allowNull: false,
    trim: true,
  },
  alumni_sd: {
    type: DataTypes.STRING(50),
    allowNull: false,
    trim: true,
  },
  alamat_sekolah_asal: {
    type: DataTypes.STRING(100),
    allowNull: false,
    trim: true,
  },
  nama_lengkap_ayah: {
    type: DataTypes.STRING(50),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('nama_lengkap_ayah', value.toLowerCase());
    },
  },
  nama_lengkap_ibu: {
    type: DataTypes.STRING(50),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('nama_lengkap_ibu', value.toLowerCase());
    },
  },
  nama_lengkap_wali: {
    type: DataTypes.STRING(50),
    allowNull: false,
    trim: true,
    set(value) {
      this.setDataValue('nama_lengkap_wali', value.toLowerCase());
    },
  },
  kode_pos: {
    type: DataTypes.STRING(5),
    allowNull: false,
    trim: true,
  },
  foto_formal: {
    type: DataTypes.STRING(255),
    allowNull: true,
    trim: true,
  },
  akta_kelahiran: {
    type: DataTypes.STRING(255),
    allowNull: true,
    trim: true,
  },
  kartu_keluarga: {
    type: DataTypes.STRING(255),
    allowNull: true,
    trim: true,
  },
  fc_ktp: {
    type: DataTypes.STRING(255),
    allowNull: true,
    trim: true,
  },
  kip_kis: {
    type: DataTypes.STRING(255),
    allowNull: true,
    trim: true,
  },
}, {
  freezeTableName: true,
  timestamps: false,
});

export default Pendaftaran;


(async () => {
    await db.sync();
})();