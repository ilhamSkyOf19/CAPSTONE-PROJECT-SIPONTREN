import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

export const Berita = mongoose.model('Berita', newsSchema);

