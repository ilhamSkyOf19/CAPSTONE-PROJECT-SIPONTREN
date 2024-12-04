import { DataTypes } from 'sequelize';
import db from '../config/database.js'; // Pastikan path database yang benar
import argon2 from 'argon2';  // Library untuk hashing password

const User = db.define('user', {
  username: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,  // Menjamin username unik
    validate: {
      notEmpty: true, // Username tidak boleh kosong
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true, // Password tidak boleh kosong
    },
  },
}, {
  freezeTableName: true,
  timestamps: true,  // Menggunakan createdAt dan updatedAt
});

// Sebelum membuat user, hash password terlebih dahulu
User.beforeCreate(async (user, options) => {
  user.password = await argon2.hash(user.password);
});

// Sebelum mengupdate user, hanya hash password jika berubah
User.beforeUpdate(async (user, options) => {
  if (user.changed('password')) {
    user.password = await argon2.hash(user.password);
  }
});

export default User;
