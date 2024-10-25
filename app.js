// module express
import express from 'express';
const app = express();
// module ejs
import expressLayouts from 'express-ejs-layouts';
// module session
import session from 'express-session';
// module cookie parser
import cookieParser from 'cookie-parser';
// module flash
import flash from 'express-flash';
// module method override
import methodOverride from 'method-override';
// import routes
import router from './routes/routes.js';

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';






app.use(cors());
app.use(express.json());

// Memuat variabel lingkungan dari file .env
dotenv.config();

// set port 
const port = process.env.PORT || 3001;

const connectDB = async () => {
    try {
        // Menghubungkan ke MongoDB menggunakan MONGODB_URI dari .env
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000 // Optional: menambah timeout
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
};

// Memanggil fungsi koneksi
connectDB();



// set view engine ejs
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Buat __filename dan __dirname manual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// public static
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// express session
app.use(session({
    secret: 'rahasia',
    resave: false,
    saveUninitialized: false,
}));

// cookie parser
app.use(cookieParser('rahasia'));

// flash
app.use(flash());

// method override
app.use(methodOverride('_method'));


// app.use(Upload, checkFileType)

// routes
app.use(router);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
