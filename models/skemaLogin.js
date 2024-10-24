import mongoose from 'mongoose';
import argon2 from 'argon2'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

// Middleware untuk mengenkripsi password sebelum disimpan
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        this.password = await argon2.hash(this.password); // Hash password dengan Argon2
        next();
    } catch (err) {
        next(err);
    }
});

// Metode untuk membandingkan password yang dimasukkan dengan password yang tersimpan
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await argon2.verify(this.password, candidatePassword); // Verifikasi password dengan Argon2
    } catch (err) {
        throw new Error(err);
    }
};

export const User = mongoose.model('User', userSchema);



