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
import router from './backend/routes/routes.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath dari url
import cors from 'cors';

app.use(cors());
app.use(express.json());

// Memuat variabel lingkungan dari file .env
dotenv.config();

// set port 
const port = process.env.PORT || 3001;

// set view engine ejs
app.use(expressLayouts);

// Buat __filename dan __dirname manual

app.set('view engine', 'ejs');

// public static
const __filename = fileURLToPath(import.meta.url); // Mendapatkan nama file saat ini
const __dirname = path.dirname(__filename); // Mendapatkan direktori dari nama file
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

// routes
app.use(router);

// Middleware untuk menangani rute yang tidak ditemukan (404)
app.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'Halaman yang Anda cari tidak ditemukan!',
        layout: 'layouts/main-ejs-layouts'
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
