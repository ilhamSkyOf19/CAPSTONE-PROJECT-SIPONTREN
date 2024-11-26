import argon2 from 'argon2'; // atau require('argon2');

export const verifyPassword = async (hashedPassword, inputPassword) => {
    try {
        return await argon2.verify(hashedPassword, inputPassword);
    } catch (error) {
        throw new Error('Error verifying password');
    }
};