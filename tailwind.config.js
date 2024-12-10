/** @type {import('tailwindcss').Config} */

import scrollbarPlugin from 'tailwind-scrollbar';

export default {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif']
      },
      boxShadow: {
        'custom': '0 5px 20px rgba(0, 0, 0, 0.1), 0 10px 6px rgba(0, 0, 0, 0.05)', // Custom shadow
      }
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.scrollbar-hidden': {
          'scrollbar-width': 'none',  // Untuk Firefox
          '-ms-overflow-style': 'none', // Untuk IE/Edge
        },
        '.scrollbar-hidden::-webkit-scrollbar': {
          display: 'none',  // Untuk Webkit-based browsers (Chrome, Safari)
        },
      });
    },
    function ({ addUtilities }) {
      addUtilities({
        '.bg-custom': {
          'background-position-x': '32rem',
          'background-position-y': '-20rem',
          'background-size': '100%',
        },
        '.bg-custom-sm': {
          'background-position-x': '0rem',
          'background-position-y': '0rem',
          'background-size': '100%',
        },
        '.bg-custom-xl': {
          'background-position-x': '32rem',
          'background-position-y': '-10rem',
          'background-size': '100%',
        },
        '.bg-custom-sejarah': {
          'background-position-x': '40rem',
          'background-position-y': '-5rem',
          'background-size': '65%',
        },
        
      });
    },
    scrollbarPlugin({ nocompatible: true }),
  ],
}

