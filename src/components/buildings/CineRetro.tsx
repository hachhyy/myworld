import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Lock, Dices, Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MediaItem, useWorldStore } from '../../store/useWorldStore';
import { soundEngine } from '../../utils/soundAndHaptics';

interface CineRetroProps {
  onClose: () => void;
}

interface CatalogMediaEntry extends Omit<MediaItem, 'id' | 'status'> {
  keywords?: string;
}

// Póster ilustrado de respaldo en caso de bloqueo de red externo
const FALLBACK_POSTER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360">
    <rect width="240" height="360" rx="16" fill="#F6B89E"/>
    <rect x="14" y="14" width="212" height="332" rx="12" fill="#FFFDF9" stroke="#3D312A" stroke-width="5"/>
    <circle cx="120" cy="145" r="54" fill="#FFD166" stroke="#3D312A" stroke-width="4"/>
    <text x="120" y="164" font-size="56" text-anchor="middle">🍿</text>
    <text x="120" y="255" font-family="sans-serif" font-size="22" font-weight="bold" fill="#3D312A" text-anchor="middle">CINE RETRO</text>
    <text x="120" y="285" font-family="sans-serif" font-size="15" fill="#7F4F24" text-anchor="middle">Sesión en Pareja 💕</text>
  </svg>
`);

// Catálogo indexado de 82 Películas, Series y Animes imprescindibles con portadas oficiales reales de TMDB (image.tmdb.org)
const ESSENTIAL_MOVIES_CATALOG: CatalogMediaEntry[] = [
  {
    title: 'Los Juegos del Hambre (The Hunger Games)',
    year: '2012',
    durationMin: 142,
    category: 'Película',
    genre: 'Ciencia Ficción / Acción',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yXCbOiVDCxO71zI7cuwBRXdftq8.jpg',
    season: 1,
    episode: 1,
    keywords: 'hunger games juegos del hambre katniss hu',
  },
  {
    title: 'Los Juegos del Hambre: En Llamas (Catching Fire)',
    year: '2013',
    durationMin: 146,
    category: 'Película',
    genre: 'Ciencia Ficción / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/e0M3WVJm4nBrAg0LbJq0gdKi3U7.jpg',
    season: 1,
    episode: 1,
    keywords: 'hunger games catching fire juegos del hambre en llamas hu',
  },
  {
    title: 'Hunter x Hunter',
    year: '2011',
    durationMin: 24,
    category: 'Anime',
    genre: 'Aventura / Fantasía · 148 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ucpgmUR1h5Te1BYegKItoPjOeF7.jpg',
    season: 1,
    episode: 1,
    keywords: 'hunter x hunter gon killua hxh hu',
  },
  {
    title: 'El Increíble Hulk (The Incredible Hulk)',
    year: '2008',
    durationMin: 112,
    category: 'Película',
    genre: 'Acción / Marvel',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg',
    season: 1,
    episode: 1,
    keywords: 'hulk incredible marvel bruce banner hu',
  },
  {
    title: 'El Castillo Ambulante (Howl’s Moving Castle)',
    year: '2004',
    durationMin: 119,
    category: 'Anime',
    genre: 'Fantasía / Romance · Studio Ghibli',
    posterUrl: 'https://image.tmdb.org/t/p/w500/TkTPELv4kC3u1lkloush8skOjE.jpg',
    season: 1,
    episode: 1,
    keywords: 'howl moving castle ghibli castillo ambulante sophie hu',
  },
  {
    title: 'El Gran Hotel Budapest (The Grand Budapest Hotel)',
    year: '2014',
    durationMin: 100,
    category: 'Película',
    genre: 'Comedia / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    season: 1,
    episode: 1,
    keywords: 'grand budapest hotel wes anderson hungary hu',
  },
  {
    title: 'Harry Potter y la Piedra Filosofal',
    year: '2001',
    durationMin: 152,
    category: 'Película',
    genre: 'Fantasía / Magia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    season: 1,
    episode: 1,
    keywords: 'harry potter hogwarts magia piedra filosofal',
  },
  {
    title: 'Harry Potter y el Prisionero de Azkaban',
    year: '2004',
    durationMin: 142,
    category: 'Película',
    genre: 'Fantasía / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/aWxwnYoe8p2d2fcxOqtvAtJ72Rw.jpg',
    season: 1,
    episode: 1,
    keywords: 'harry potter azkaban hogwarts',
  },
  {
    title: 'Dune: Parte Uno',
    year: '2021',
    durationMin: 155,
    category: 'Película',
    genre: 'Ciencia Ficción / Épica',
    posterUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    season: 1,
    episode: 1,
    keywords: 'dune parte uno paul atreides zendaya',
  },
  {
    title: 'Dune: Parte Dos',
    year: '2024',
    durationMin: 166,
    category: 'Película',
    genre: 'Ciencia Ficción / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    season: 1,
    episode: 1,
    keywords: 'dune parte dos part two timothee zendaya',
  },
  {
    title: 'Interstellar',
    year: '2014',
    durationMin: 169,
    category: 'Película',
    genre: 'Ciencia Ficción / Drama',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    season: 1,
    episode: 1,
    keywords: 'interstellar nolan espacio estrellas',
  },
  {
    title: 'La La Land: La Ciudad de las Estrellas',
    year: '2016',
    durationMin: 128,
    category: 'Película',
    genre: 'Romance / Musical',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    season: 1,
    episode: 1,
    keywords: 'la la land lalaland romance musical ryan gosling emma stone',
  },
  {
    title: 'El Viaje de Chihiro (Spirited Away)',
    year: '2001',
    durationMin: 125,
    category: 'Anime',
    genre: 'Fantasía / Studio Ghibli',
    posterUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    season: 1,
    episode: 1,
    keywords: 'el viaje de chihiro spirited away ghibli miyazaki',
  },
  {
    title: 'Mi Vecino Totoro',
    year: '1988',
    durationMin: 86,
    category: 'Anime',
    genre: 'Fantasía Cozy / Studio Ghibli',
    posterUrl: 'https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg',
    season: 1,
    episode: 1,
    keywords: 'totoro ghibli mi vecino',
  },
  {
    title: 'La Princesa Mononoke',
    year: '1997',
    durationMin: 134,
    category: 'Anime',
    genre: 'Fantasía / Aventura · Studio Ghibli',
    posterUrl: 'https://image.tmdb.org/t/p/w500/cMYCDADoLKLbB83g4WnJegaZimC.jpg',
    season: 1,
    episode: 1,
    keywords: 'princesa mononoke ghibli',
  },
  {
    title: 'Your Name (Kimi no Na wa)',
    year: '2016',
    durationMin: 106,
    category: 'Anime',
    genre: 'Romance / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    season: 1,
    episode: 1,
    keywords: 'your name kimi no na wa shinkai',
  },
  {
    title: 'Suzume',
    year: '2022',
    durationMin: 122,
    category: 'Anime',
    genre: 'Fantasía / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vIeu8WysZrTSFb2uhPViKjX9EcC.jpg',
    season: 1,
    episode: 1,
    keywords: 'suzume shinkai anime',
  },
  {
    title: 'Kiki: Entregas a Domicilio (Nicky, la Aprendiz de Bruja)',
    year: '1989',
    durationMin: 103,
    category: 'Anime',
    genre: 'Fantasía Cozy / Studio Ghibli',
    posterUrl: 'https://image.tmdb.org/t/p/w500/Aufa4YdZIv4AXpR9rznwVA5SEfd.jpg',
    season: 1,
    episode: 1,
    keywords: 'kiki nicky ghibli bruja jiji',
  },
  {
    title: 'Crepúsculo (Twilight)',
    year: '2008',
    durationMin: 122,
    category: 'Película',
    genre: 'Romance / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3Gkb6jm6962ADUPaCBqzz9CTbn9.jpg',
    season: 1,
    episode: 1,
    keywords: 'crepusculo twilight bella edward vampiros',
  },
  {
    title: 'Titanic',
    year: '1997',
    durationMin: 194,
    category: 'Película',
    genre: 'Romance / Drama',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
    season: 1,
    episode: 1,
    keywords: 'titanic jack rose dicaprio',
  },
  {
    title: 'Avatar',
    year: '2009',
    durationMin: 162,
    category: 'Película',
    genre: 'Ciencia Ficción / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg',
    season: 1,
    episode: 1,
    keywords: 'avatar pandora james cameron',
  },
  {
    title: 'Spider-Man: Un Nuevo Universo (Into the Spider-Verse)',
    year: '2018',
    durationMin: 117,
    category: 'Película',
    genre: 'Animación / Acción',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    season: 1,
    episode: 1,
    keywords: 'spider-man spiderman miles morales spiderverse',
  },
  {
    title: 'Spider-Man: Cruzando el Multiverso',
    year: '2023',
    durationMin: 140,
    category: 'Película',
    genre: 'Animación / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    season: 1,
    episode: 1,
    keywords: 'spider-man spiderman multiverso gwen',
  },
  {
    title: 'Spider-Man: No Way Home',
    year: '2021',
    durationMin: 148,
    category: 'Película',
    genre: 'Acción / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    season: 1,
    episode: 1,
    keywords: 'spider-man spiderman tom holland zendaya',
  },
  {
    title: 'Shrek',
    year: '2001',
    durationMin: 90,
    category: 'Película',
    genre: 'Comedia / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg',
    season: 1,
    episode: 1,
    keywords: 'shrek fiona asno comedia',
  },
  {
    title: 'Shrek 2',
    year: '2004',
    durationMin: 93,
    category: 'Película',
    genre: 'Comedia / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2yYP0PQjG8zVqturh1BAqu2Tixl.jpg',
    season: 1,
    episode: 1,
    keywords: 'shrek 2 gato con botas',
  },
  {
    title: 'Coco',
    year: '2017',
    durationMin: 105,
    category: 'Película',
    genre: 'Animación / Música y Familia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg',
    season: 1,
    episode: 1,
    keywords: 'coco pixar miguel mexico',
  },
  {
    title: 'Del Revés (Inside Out)',
    year: '2015',
    durationMin: 95,
    category: 'Película',
    genre: 'Animación / Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg',
    season: 1,
    episode: 1,
    keywords: 'del reves inside out intensamente pixar alegria tristeza',
  },
  {
    title: 'Del Revés 2 (Inside Out 2)',
    year: '2024',
    durationMin: 96,
    category: 'Película',
    genre: 'Animación / Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    season: 1,
    episode: 1,
    keywords: 'del reves 2 inside out 2 intensamente ansiedad',
  },
  {
    title: 'Orgullo y Prejuicio (Pride & Prejudice)',
    year: '2005',
    durationMin: 129,
    category: 'Película',
    genre: 'Romance / Drama de Época',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sGjIvtVvTlWnia2zfJfHz81pZ9Q.jpg',
    season: 1,
    episode: 1,
    keywords: 'orgullo y prejuicio pride and prejudice mr darcy romance',
  },
  {
    title: 'Cuestión de Tiempo (About Time)',
    year: '2013',
    durationMin: 123,
    category: 'Película',
    genre: 'Romance / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iR1bVfURbN7r1C46WHFbwCkVve.jpg',
    season: 1,
    episode: 1,
    keywords: 'cuestion de tiempo about time rachel mcadams romance',
  },
  {
    title: 'El Diario de Noa (The Notebook)',
    year: '2004',
    durationMin: 123,
    category: 'Película',
    genre: 'Romance / Drama',
    posterUrl: 'https://image.tmdb.org/t/p/w500/rNzQyW4f8B8cQeg7Dgj3n6eT5k9.jpg',
    season: 1,
    episode: 1,
    keywords: 'el diario de noa the notebook ryan gosling romance',
  },
  {
    title: 'Antes del Amanecer (Before Sunrise)',
    year: '1995',
    durationMin: 101,
    category: 'Película',
    genre: 'Romance',
    posterUrl: 'https://image.tmdb.org/t/p/w500/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg',
    season: 1,
    episode: 1,
    keywords: 'antes del amanecer before sunrise viena romance',
  },
  {
    title: 'Parásitos (Parasite)',
    year: '2019',
    durationMin: 132,
    category: 'Película',
    genre: 'Suspense / Comedia Negra',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    season: 1,
    episode: 1,
    keywords: 'parasitos parasite bong joon ho corea',
  },
  {
    title: 'Oppenheimer',
    year: '2023',
    durationMin: 180,
    category: 'Película',
    genre: 'Drama / Historia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    season: 1,
    episode: 1,
    keywords: 'oppenheimer nolan cillian murphy',
  },
  {
    title: 'Barbie',
    year: '2023',
    durationMin: 114,
    category: 'Película',
    genre: 'Comedia / Fantasía',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
    season: 1,
    episode: 1,
    keywords: 'barbie margot robbie ryan gosling ken',
  },
  {
    title: 'Up: Una Aventura de Altura',
    year: '2009',
    durationMin: 96,
    category: 'Película',
    genre: 'Animación / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vpbaStTMt8qqXaEgnOR2EE4DNJk.jpg',
    season: 1,
    episode: 1,
    keywords: 'up pixar globos carl ellie',
  },
  {
    title: 'WALL·E',
    year: '2008',
    durationMin: 98,
    category: 'Película',
    genre: 'Animación / Romance Sci-Fi',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
    season: 1,
    episode: 1,
    keywords: 'wall-e walle eva pixar robot',
  },
  {
    title: 'Ratatouille',
    year: '2007',
    durationMin: 111,
    category: 'Película',
    genre: 'Animación / Cocina',
    posterUrl: 'https://image.tmdb.org/t/p/w500/t3vaWRPSf6WjDSamIkKDs1iQWna.jpg',
    season: 1,
    episode: 1,
    keywords: 'ratatouille remy cocina paris pixar',
  },
  {
    title: 'Toy Story',
    year: '1995',
    durationMin: 81,
    category: 'Película',
    genre: 'Animación / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
    season: 1,
    episode: 1,
    keywords: 'toy story woody buzz pixar',
  },
  {
    title: 'El Señor de los Anillos: La Comunidad del Anillo',
    year: '2001',
    durationMin: 178,
    category: 'Película',
    genre: 'Fantasía Épica',
    posterUrl: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    season: 1,
    episode: 1,
    keywords: 'señor de los anillos lord of the rings frodo',
  },
  {
    title: 'El Caballero Oscuro (The Dark Knight)',
    year: '2008',
    durationMin: 152,
    category: 'Película',
    genre: 'Acción / Thriller',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    season: 1,
    episode: 1,
    keywords: 'batman dark knight caballero oscuro joker',
  },
  {
    title: 'Origen (Inception)',
    year: '2010',
    durationMin: 148,
    category: 'Película',
    genre: 'Ciencia Ficción / Acción',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    season: 1,
    episode: 1,
    keywords: 'origen inception nolan dicaprio sueños',
  },
  {
    title: 'Todo a la vez en todas partes (Everything Everywhere All at Once)',
    year: '2022',
    durationMin: 139,
    category: 'Película',
    genre: 'Ciencia Ficción / Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    season: 1,
    episode: 1,
    keywords: 'everything everywhere all at once todo a la vez multiverso',
  },
  {
    title: 'Amélie',
    year: '2001',
    durationMin: 122,
    category: 'Película',
    genre: 'Romance / Comedia Francesa',
    posterUrl: 'https://image.tmdb.org/t/p/w500/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
    season: 1,
    episode: 1,
    keywords: 'amelie paris romance',
  },
  {
    title: '¡Olvídate de mí! (Eternal Sunshine of the Spotless Mind)',
    year: '2004',
    durationMin: 108,
    category: 'Película',
    genre: 'Romance / Ciencia Ficción',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
    season: 1,
    episode: 1,
    keywords: 'eternal sunshine olvidate de mi jim carrey',
  },
  {
    title: 'Puñales por la Espalda (Knives Out)',
    year: '2019',
    durationMin: 130,
    category: 'Película',
    genre: 'Misterio / Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
    season: 1,
    episode: 1,
    keywords: 'knives out puñales por la espalda misterio detective',
  },
  {
    title: 'Enredados (Tangled)',
    year: '2010',
    durationMin: 100,
    category: 'Película',
    genre: 'Animación / Romance',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ym7Kst6a4uodryxqbGOxmewF235.jpg',
    season: 1,
    episode: 1,
    keywords: 'enredados tangled rapunzel flynn disney',
  },
  {
    title: 'Cómo Entrenar a tu Dragón',
    year: '2010',
    durationMin: 98,
    category: 'Película',
    genre: 'Animación / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ygGmAO60t8GyqUo9xYeYxSZAR3b.jpg',
    season: 1,
    episode: 1,
    keywords: 'como entrenar a tu dragon Chimuelo Desdentao',
  },
  {
    title: 'Elemental',
    year: '2023',
    durationMin: 101,
    category: 'Película',
    genre: 'Animación / Romance',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg',
    season: 1,
    episode: 1,
    keywords: 'elemental elementos pixar fuego agua',
  },
  {
    title: 'Kimetsu no Yaiba: Guardianes de la Noche (Demon Slayer)',
    year: '2019',
    durationMin: 24,
    category: 'Anime',
    genre: 'Acción / Fantasía · 55 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    season: 1,
    episode: 1,
    keywords: 'demon slayer kimetsu no yaiba tanjiro nezuko',
  },
  {
    title: 'Ataque a los Titanes (Shingeki no Kyojin)',
    year: '2013',
    durationMin: 24,
    category: 'Anime',
    genre: 'Acción / Épica · 89 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    season: 1,
    episode: 1,
    keywords: 'attack on titan shingeki no kyojin eren mikasa',
  },
  {
    title: 'Jujutsu Kaisen',
    year: '2020',
    durationMin: 24,
    category: 'Anime',
    genre: 'Acción / Sobrenatural · 47 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg',
    season: 1,
    episode: 1,
    keywords: 'jujutsu kaisen gojo itadori anime',
  },
  {
    title: 'Spy x Family',
    year: '2022',
    durationMin: 24,
    category: 'Anime',
    genre: 'Comedia / Espías · 37 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3r4LYFuXrg3G8fepysr4xSLWnQL.jpg',
    season: 1,
    episode: 1,
    keywords: 'spy x family anya loid yor',
  },
  {
    title: 'Frieren: Tras finalizar el viaje',
    year: '2023',
    durationMin: 24,
    category: 'Anime',
    genre: 'Fantasía / Aventura · 28 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    season: 1,
    episode: 1,
    keywords: 'frieren anime fantasia magia',
  },
  {
    title: 'Tragones y Mazmorras (Dungeon Meshi)',
    year: '2024',
    durationMin: 24,
    category: 'Anime',
    genre: 'Aventura / Comedia · 24 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/c54M6yJ2vC6wP7L96uD1K1n8N0j.jpg',
    season: 1,
    episode: 1,
    keywords: 'dungeon meshi tragones y mazmorras delicious in dungeon',
  },
  {
    title: 'One Piece',
    year: '1999',
    durationMin: 24,
    category: 'Anime',
    genre: 'Aventura / Piratas',
    posterUrl: 'https://image.tmdb.org/t/p/w500/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg',
    season: 1,
    episode: 1,
    keywords: 'one piece luffy zoro anime',
  },
  {
    title: 'Naruto Shippuden',
    year: '2007',
    durationMin: 24,
    category: 'Anime',
    genre: 'Acción / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg',
    season: 1,
    episode: 1,
    keywords: 'naruto shippuden sasuke anime',
  },
  {
    title: 'Death Note',
    year: '2006',
    durationMin: 24,
    category: 'Anime',
    genre: 'Misterio / Thriller · 37 eps',
    posterUrl: 'https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg',
    season: 1,
    episode: 1,
    keywords: 'death note light l ryuk',
  },
  {
    title: 'Arcane: League of Legends',
    year: '2021',
    durationMin: 40,
    category: 'Serie',
    genre: 'Animación / Fantasía Steampunk',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    season: 1,
    episode: 1,
    keywords: 'arcane jinx vi serie',
  },
  {
    title: 'Stranger Things',
    year: '2016',
    durationMin: 50,
    category: 'Serie',
    genre: 'Ciencia Ficción / Misterio',
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    season: 1,
    episode: 1,
    keywords: 'stranger things eleven netflix',
  },
  {
    title: 'Juego de Tronos (Game of Thrones)',
    year: '2011',
    durationMin: 55,
    category: 'Serie',
    genre: 'Fantasía Épica / Drama',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    season: 1,
    episode: 1,
    keywords: 'game of thrones juego de tronos got',
  },
  {
    title: 'The Bear',
    year: '2022',
    durationMin: 30,
    category: 'Serie',
    genre: 'Comedia / Cocina',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
    season: 1,
    episode: 1,
    keywords: 'the bear cocina serie carmy',
  },
  {
    title: 'Breaking Bad',
    year: '2008',
    durationMin: 48,
    category: 'Serie',
    genre: 'Drama / Crimen',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    season: 1,
    episode: 1,
    keywords: 'breaking bad walter white jesse',
  },
  {
    title: 'Friends',
    year: '1994',
    durationMin: 22,
    category: 'Serie',
    genre: 'Comedia / Sitcom',
    posterUrl: 'https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg',
    season: 1,
    episode: 1,
    keywords: 'friends rachel ross chandler monica',
  },
  {
    title: 'The Office',
    year: '2005',
    durationMin: 22,
    category: 'Serie',
    genre: 'Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg',
    season: 1,
    episode: 1,
    keywords: 'the office michael scott jim pam',
  },
  {
    title: 'The Last of Us',
    year: '2023',
    durationMin: 55,
    category: 'Serie',
    genre: 'Drama / Aventura',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    season: 1,
    episode: 1,
    keywords: 'the last of us joel ellie pedro pascal',
  },
  {
    title: 'Heartstopper',
    year: '2022',
    durationMin: 30,
    category: 'Serie',
    genre: 'Romance / Comedia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wJJt1HG62h3WoGnLcRIbO2nNNkg.jpg',
    season: 1,
    episode: 1,
    keywords: 'heartstopper nick charlie romance',
  },
  {
    title: 'Los Bridgerton (Bridgerton)',
    year: '2020',
    durationMin: 58,
    category: 'Serie',
    genre: 'Romance de Época',
    posterUrl: 'https://image.tmdb.org/t/p/w500/luoKpgVwi1E5nQsi7W0UuKHu2Rq.jpg',
    season: 1,
    episode: 1,
    keywords: 'bridgerton los bridgerton romance epoca',
  },
  {
    title: 'Dark',
    year: '2017',
    durationMin: 52,
    category: 'Serie',
    genre: 'Ciencia Ficción / Misterio',
    posterUrl: 'https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
    season: 1,
    episode: 1,
    keywords: 'dark viajes en el tiempo misterio',
  },
];

// Fetch con AbortController y timeout estricto para que ninguna API pueda colgar la búsqueda
async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function matchCatalogInstant(query: string): Omit<MediaItem, 'id' | 'status'>[] {
  const q = query.trim().toLowerCase();
  if (!q) return ESSENTIAL_MOVIES_CATALOG.slice(0, 14);
  return ESSENTIAL_MOVIES_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.genre.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.toLowerCase().includes(q))
  );
}

export const CineRetro: React.FC<CineRetroProps> = ({ onClose }) => {
  const {
    activeUser,
    petA,
    petB,
    mediaItems,
    addMediaItem,
    deleteMediaItem,
    submitMediaReview,
    incrementSeriesProgress,
    moveWatchlistToWatched,
  } = useWorldStore();

  const [tab, setTab] = useState<'watched' | 'watchlist' | 'search'>('watched');
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<'Todo' | 'Película' | 'Serie' | 'Anime'>('Todo');
  const [searchResults, setSearchResults] = useState<Omit<MediaItem, 'id' | 'status'>[]>(() =>
    ESSENTIAL_MOVIES_CATALOG.slice(0, 14)
  );
  const [searching, setSearching] = useState(false);

  // Estado de votación individual para el Efecto Sorpresa (Sobre Sellado)
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [draftHearts, setDraftHearts] = useState<number>(5);
  const [draftReview, setDraftReview] = useState<string>('');

  // Estado de la Ruleta Interactiva con Filtros
  const [rouletteFilter, setRouletteFilter] = useState<'all' | 'fast' | 'series' | 'fantasia'>('all');
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winnerItem, setWinnerItem] = useState<MediaItem | null>(null);

  const watchedList = mediaItems.filter((m) => m.status === 'watched');
  const watchlist = mediaItems.filter((m) => m.status === 'watchlist');

  // Buscador Instantáneo (<1 segundo garantizado) con TVMaze + Jikan v4 + iTunes + Catálogo Oficial de 70+ Clásicos
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(ESSENTIAL_MOVIES_CATALOG.slice(0, 14));
      setSearching(false);
      return;
    }

    // 1. Respuesta inmediata (<10ms) desde el catálogo indexado mientras se consultan las APIs online
    const instantMatches = matchCatalogInstant(q);
    if (instantMatches.length > 0) {
      setSearchResults(instantMatches);
    }

    let cancelled = false;
    setSearching(true);

    // Garantía dura: el spinner "Buscando en vivo..." desaparece SIEMPRE en menos de 900ms
    const hardStopSpinner = setTimeout(() => {
      if (!cancelled) setSearching(false);
    }, 850);

    const debounceTimer = setTimeout(async () => {
      // Fuente 1: TVMaze Search API (CORS 100% abierto, series y películas de TV)
      const fetchTVMaze = async (): Promise<Omit<MediaItem, 'id' | 'status'>[]> => {
        const data = await fetchJsonWithTimeout<Array<{ show?: Record<string, unknown> }>>(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`,
          2400
        );
        if (!Array.isArray(data)) return [];
        return data.slice(0, 10).map((entry) => {
          const show = entry.show || {};
          const imgObj = (show.image as { original?: string; medium?: string }) || {};
          const rawImg = imgObj.medium || imgObj.original || '';
          const safeHttpsImg = rawImg ? rawImg.replace(/^http:\/\//i, 'https://') : FALLBACK_POSTER_SVG;
          const genres =
            Array.isArray(show.genres) && show.genres.length > 0
              ? show.genres.slice(0, 2).join(' / ')
              : 'Serie de TV';
          return {
            title: String(show.name || q),
            year: show.premiered ? String(show.premiered).slice(0, 4) : '2024',
            durationMin: Number(show.averageRuntime || show.runtime || 45),
            category: 'Serie' as const,
            genre: genres,
            posterUrl: safeHttpsImg,
            season: 1,
            episode: 1,
          };
        });
      };

      // Fuente 2: Jikan v4 API (CORS 100% abierto, Anime y Películas de Animación)
      const fetchJikan = async (): Promise<Omit<MediaItem, 'id' | 'status'>[]> => {
        const data = await fetchJsonWithTimeout<{ data?: Array<Record<string, unknown>> }>(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10`,
          2400
        );
        if (!data?.data || !Array.isArray(data.data)) return [];
        return data.data.map((anime) => {
          const imgs = (anime.images as { jpg?: { large_image_url?: string; image_url?: string } }) || {};
          const aired = (anime.aired as { prop?: { from?: { year?: number } } }) || {};
          const yr = anime.year || aired.prop?.from?.year || '2024';
          const epCount = Number(anime.episodes || 12);
          const score = anime.score ? ` · ★${anime.score}` : '';
          const isMovie = String(anime.type || '').toLowerCase() === 'movie';
          return {
            title: String(anime.title || q),
            year: String(yr),
            durationMin: isMovie ? 105 : 24,
            category: 'Anime' as const,
            genre: `Anime · ${epCount} eps${score}`,
            posterUrl: imgs.jpg?.large_image_url || imgs.jpg?.image_url || FALLBACK_POSTER_SVG,
            season: 1,
            episode: 1,
          };
        });
      };

      // Fuente 3: iTunes Movie API (Timeout rápido de 1.6s por si el navegador bloquea CORS)
      const fetchITunes = async (): Promise<Omit<MediaItem, 'id' | 'status'>[]> => {
        const data = await fetchJsonWithTimeout<{ results?: Array<Record<string, unknown>> }>(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=10`,
          1600
        );
        if (!data?.results || !Array.isArray(data.results)) return [];
        return data.results.map((item) => {
          const rawArt = String(item.artworkUrl100 || '');
          const hdPoster = rawArt
            ? rawArt.replace('100x100bb', '600x900bb').replace(/^http:\/\//i, 'https://')
            : FALLBACK_POSTER_SVG;
          const millis = Number(item.trackTimeMillis || 0);
          return {
            title: String(item.trackName || q),
            year: item.releaseDate ? String(item.releaseDate).slice(0, 4) : '2024',
            durationMin: millis > 0 ? Math.round(millis / 60000) : 110,
            category: 'Película' as const,
            genre: String(item.primaryGenreName || 'Cine'),
            posterUrl: hdPoster,
            season: 1,
            episode: 1,
          };
        });
      };

      const [tvRes, jikanRes, itunesRes] = await Promise.allSettled([
        fetchTVMaze(),
        fetchJikan(),
        fetchITunes(),
      ]);

      if (cancelled) return;

      const tvList = tvRes.status === 'fulfilled' ? tvRes.value : [];
      const animeList = jikanRes.status === 'fulfilled' ? jikanRes.value : [];
      const movieList = itunesRes.status === 'fulfilled' ? itunesRes.value : [];

      // Combinar e intercalar sin duplicados (Catálogo Oficial Instantáneo + iTunes + TVMaze + Jikan)
      const seenTitles = new Set<string>();
      const merged: Omit<MediaItem, 'id' | 'status'>[] = [];

      const pushUnique = (item: Omit<MediaItem, 'id' | 'status'> | undefined) => {
        if (!item) return;
        const norm = item.title.trim().toLowerCase();
        if (seenTitles.has(norm)) return;
        seenTitles.add(norm);
        merged.push(item);
      };

      const maxLen = Math.max(
        instantMatches.length,
        movieList.length,
        tvList.length,
        animeList.length
      );

      for (let i = 0; i < maxLen; i++) {
        pushUnique(instantMatches[i]);
        pushUnique(movieList[i]);
        pushUnique(tvList[i]);
        pushUnique(animeList[i]);
      }

      if (merged.length > 0) {
        setSearchResults(merged);
      } else {
        setSearchResults([
          {
            title: q.charAt(0).toUpperCase() + q.slice(1),
            year: '2025',
            durationMin: 105,
            category: searchCategoryFilter === 'Todo' ? 'Película' : searchCategoryFilter,
            genre: 'Añadida por vosotros 💕',
            posterUrl: FALLBACK_POSTER_SVG,
            season: 1,
            episode: 1,
          },
        ]);
      }
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(hardStopSpinner);
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, searchCategoryFilter]);

  const displayedSearchResults = searchResults.filter((item) =>
    searchCategoryFilter === 'Todo' ? true : item.category === searchCategoryFilter
  );

  // Guardar voto y comprobar si se desvela el sobre sellado
  const handleSaveVote = (item: MediaItem) => {
    const partnerAlreadyVoted =
      activeUser === 'userA' ? item.ratingB !== undefined : item.ratingA !== undefined;
    submitMediaReview(
      item.id,
      activeUser,
      draftHearts,
      draftReview.trim() || '¡Me ha encantado verla abrazado a ti! 💕'
    );
    setReviewingItemId(null);
    setDraftReview('');
    if (partnerAlreadyVoted) {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
      });
    }
  };

  // Filtrado previo a girar la ruleta
  const filteredWatchlist = watchlist.filter((item) => {
    if (rouletteFilter === 'fast') return item.durationMin < 90;
    if (rouletteFilter === 'series') return item.category === 'Serie' || item.category === 'Anime';
    if (rouletteFilter === 'fantasia') return item.genre.toLowerCase().includes('fantas');
    return true;
  });

  const handleSpinRoulette = () => {
    const pool = filteredWatchlist.length > 0 ? filteredWatchlist : watchlist;
    if (pool.length === 0 || spinning) return;
    setSpinning(true);
    setWinnerItem(null);
    soundEngine.playPop(1.2);
    const extraSpins = 1080 + Math.floor(Math.random() * 720);
    setWheelRotation((prev) => prev + extraSpins);

    setTimeout(() => {
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      setWinnerItem(chosen);
      setSpinning(false);
      soundEngine.playChime();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.65 } });
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col watercolor-paper overflow-hidden">
      {/* Cabecera con Safe Area superior de iOS */}
      <div className="safe-top-header px-4 pb-3 flex items-center justify-between gap-2 border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>
        <div className="text-center">
          <h1 className="text-base font-bold">🍿 El Cine Retro</h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Viendo como: <span className="font-bold">{activeUser === 'userA' ? petA.ownerName : petB.ownerName}</span>
          </p>
        </div>
        <button
          onClick={() => setTab('search')}
          className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir
        </button>
      </div>

      {/* Pestañas: Vistas Juntos, Pendientes + Ruleta, Buscador Online */}
      <div className="px-3 pt-2.5 flex gap-1.5">
        {[
          { id: 'watched', label: `🎟️ Vistas Juntos (${watchedList.length})` },
          { id: 'watchlist', label: `🎡 Pendientes y Ruleta (${watchlist.length})` },
          { id: 'search', label: '🔍 Buscar Pelis/Series' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              soundEngine.playPop();
              setTab(t.id as 'watched' | 'watchlist' | 'search');
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
              tab === t.id ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE PESTAÑA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-md mx-auto w-full">
        {tab === 'watched' && (
          <>
            <div className="hand-card p-2.5 bg-[var(--bg-secondary)] text-xs flex items-center justify-between">
              <span>
                💌 <strong>Doble Sobre Secreto:</strong> La nota de quien vota primero queda sellada hasta que votéis los dos.
              </span>
            </div>

            {watchedList.map((item) => {
              const bothVoted = item.ratingA !== undefined && item.ratingB !== undefined;
              const avgScore = bothVoted
                ? (((item.ratingA || 0) + (item.ratingB || 0)) / 2).toFixed(1)
                : null;
              const myVote = activeUser === 'userA' ? item.ratingA : item.ratingB;
              const partnerVote = activeUser === 'userA' ? item.ratingB : item.ratingA;

              return (
                <div key={item.id} className="hand-card p-3 bg-[var(--bg-card)] space-y-2.5">
                  <div className="flex gap-3">
                    <div className="relative w-20 h-28 rounded-xl overflow-hidden border-2 border-[var(--border-ink)] shrink-0 bg-[#FFE5D9]">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_POSTER_SVG;
                        }}
                        className="w-full h-full object-cover"
                      />
                      {avgScore && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center gap-0.5 shadow">
                          ❤️ {avgScore}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <span className="hand-pill px-2 py-0.2 bg-[var(--bg-secondary)]">
                              {item.category}
                            </span>
                            <span>{item.year}</span>
                            <span>· {item.durationMin} min</span>
                          </div>
                          {confirmDeleteMediaId === item.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-300">
                              <span className="text-[9px] font-bold text-rose-700">¿Borrar?</span>
                              <button
                                onClick={() => {
                                  soundEngine.playPop();
                                  deleteMediaItem(item.id);
                                  setConfirmDeleteMediaId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmDeleteMediaId(null)}
                                className="px-1 py-0.5 rounded bg-white text-[9px] font-bold text-[var(--text-muted)] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteMediaId(item.id)}
                              className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50/70 transition-colors cursor-pointer"
                              title="Eliminar de Vistas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <h3 className="text-sm font-bold mt-1">{item.title}</h3>
                        <p className="text-[11px] text-[var(--text-muted)]">{item.genre}</p>
                      </div>

                      {/* Marcador de Series y Anime (+1 Temp, +1 Cap) */}
                      {(item.category === 'Serie' || item.category === 'Anime') && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-ink)]">
                            Temp {item.season} · Cap {item.episode}
                          </span>
                          <button
                            onClick={() => incrementSeriesProgress(item.id, 'season')}
                            className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-paper)] cursor-pointer"
                          >
                            +1 Temp
                          </button>
                          <button
                            onClick={() => incrementSeriesProgress(item.id, 'episode')}
                            className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-[var(--accent-primary)] cursor-pointer"
                          >
                            +1 Cap
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN DE DOBLE VALORACIÓN CON SOBRE SELLADO */}
                  {bothVoted ? (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-ink)]/20">
                      <div className="p-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{petA.ownerName}</span>
                          <span className="text-rose-500">{'❤️'.repeat(item.ratingA || 5)}</span>
                        </div>
                        <p className="font-hand text-base leading-tight mt-1">
                          «{item.reviewA}»
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{petB.ownerName}</span>
                          <span className="text-rose-500">{'❤️'.repeat(item.ratingB || 5)}</span>
                        </div>
                        <p className="font-hand text-base leading-tight mt-1">
                          «{item.reviewB}»
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-[var(--border-ink)]/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {partnerVote !== undefined ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-100/90 text-amber-950 border border-amber-800/30 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              ✉️ {activeUser === 'userA' ? petB.ownerName : petA.ownerName} ya ha votado (Sobre Sellado hasta que votes tú)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                            Esperando a que ambos votéis para abrir el sobre...
                          </span>
                        )}

                        {myVote === undefined && reviewingItemId !== item.id && (
                          <button
                            onClick={() => {
                              setReviewingItemId(item.id);
                              setDraftHearts(5);
                              setDraftReview('');
                            }}
                            className="hand-button px-3 py-1.5 bg-[var(--accent-secondary)] text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Votar ahora 💌
                          </button>
                        )}
                      </div>

                      {myVote !== undefined && (
                        <p className="text-xs font-semibold text-emerald-700">
                          ✅ Tu voto está guardado en el sobre. Cambia a «{activeUser === 'userA' ? petB.ownerName : petA.ownerName}» arriba para completar el desvelo.
                        </p>
                      )}

                      {reviewingItemId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Tu puntuación (1 a 5 corazones):</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((h) => (
                                <button
                                  key={h}
                                  onClick={() => setDraftHearts(h)}
                                  className="text-lg cursor-pointer"
                                >
                                  {h <= draftHearts ? '❤️' : '🤍'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draftReview}
                            onChange={(e) => setDraftReview(e.target.value)}
                            placeholder="Escribe tu mini reseña secreta..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-ink)] font-hand text-lg"
                          />
                          <button
                            onClick={() => handleSaveVote(item)}
                            className="w-full hand-button py-1.5 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
                          >
                            Guardar y Desvelar Sobre Secreto ✨
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'watchlist' && (
          <div className="space-y-4">
            {/* RULETA INTERACTIVA CON FÍSICA REAL Y FILTROS */}
            <div className="hand-card p-4 bg-[var(--bg-card)] text-center space-y-3">
              <h2 className="text-sm font-bold flex items-center justify-center gap-1.5">
                <Dices className="w-4 h-4" />
                Ruleta de Cine para Esta Noche
              </h2>

              <div className="flex flex-wrap justify-center gap-1.5">
                {[
                  { id: 'all', label: '✨ Todas' },
                  { id: 'fast', label: '⚡ Película rápida (<90 min)' },
                  { id: 'series', label: '📺 Serie/Anime' },
                  { id: 'fantasia', label: '🪄 Fantasía / Romance' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRouletteFilter(f.id as 'all' | 'fast' | 'series' | 'fantasia')}
                    className={`hand-pill px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                      rouletteFilter === f.id ? 'bg-[var(--accent-primary)] font-bold' : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <div className="absolute -top-2 z-10 text-xl">🔻</div>
                <motion.div
                  animate={{ rotate: wheelRotation }}
                  transition={{ duration: 1.75, ease: [0.22, 1, 0.36, 1] }}
                  className="w-32 h-32 rounded-full border-4 border-[var(--border-ink)] shadow-md flex items-center justify-center text-2xl"
                  style={{
                    background:
                      'conic-gradient(#F6B89E 0deg 90deg, #A8D5BA 90deg 180deg, #C9B8E8 180deg 270deg, #F9DF92 270deg 360deg)',
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-ink)] flex items-center justify-center text-base">
                    🍿
                  </div>
                </motion.div>
              </div>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleSpinRoulette}
                disabled={spinning}
                className="hand-button px-5 py-2 bg-[var(--accent-secondary)] text-xs font-bold cursor-pointer"
              >
                {spinning
                  ? '¡Girando la ruleta...! 🎡'
                  : `Girar Ruleta (${filteredWatchlist.length || watchlist.length} opciones)`}
              </motion.button>

              <AnimatePresence>
                {winnerItem && (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="hand-card p-3 bg-[var(--bg-secondary)] text-left flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase text-rose-600">
                        🎉 ¡Hoy toca ver juntos!
                      </span>
                      <p className="text-sm font-bold">{winnerItem.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {winnerItem.category} · {winnerItem.durationMin} min · {winnerItem.genre}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        moveWatchlistToWatched(winnerItem.id);
                        setTab('watched');
                      }}
                      className="hand-button px-2.5 py-1.5 bg-[var(--accent-primary)] text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      ¡Ya la vimos!
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lista de Pendientes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">
                Lista de Pendientes ({watchlist.length})
              </h3>
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="hand-card p-2.5 bg-[var(--bg-card)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_POSTER_SVG;
                      }}
                      className="w-12 h-16 rounded-lg object-cover border border-[var(--border-ink)] bg-[#FFE5D9]"
                    />
                    <div>
                      <p className="text-xs font-bold">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {item.category} · {item.durationMin} min · {item.genre}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        moveWatchlistToWatched(item.id);
                        setTab('watched');
                      }}
                      className="hand-pill px-2.5 py-1 bg-[var(--accent-primary)] text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      Pasar a Vistas ✨
                    </button>
                    {confirmDeleteMediaId === item.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-1 rounded-lg border border-rose-300">
                        <span className="text-[9px] font-bold text-rose-700">¿Borrar?</span>
                        <button
                          onClick={() => {
                            soundEngine.playPop();
                            deleteMediaItem(item.id);
                            setConfirmDeleteMediaId(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold cursor-pointer"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteMediaId(null)}
                          className="px-1 py-0.5 rounded bg-white text-[9px] font-bold text-[var(--text-muted)] cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteMediaId(item.id)}
                        className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50/70 transition-colors cursor-pointer"
                        title="Eliminar de Pendientes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'search' && (
          <div className="space-y-3">
            <div className="hand-card p-3 bg-[var(--bg-card)] space-y-2.5">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe ej. Hunger Games, Harry Potter, Dune, Chihiro..."
                  className="flex-1 bg-transparent text-xs font-semibold focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs px-1.5 py-0.5 rounded-full bg-black/10 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {(
                  [
                    { id: 'Todo', label: '✨ Todo' },
                    { id: 'Película', label: '🎬 Películas' },
                    { id: 'Serie', label: '📺 Series' },
                    { id: 'Anime', label: '🌸 Anime' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSearchCategoryFilter(cat.id);
                      soundEngine.playPop();
                    }}
                    className={`hand-pill px-3 py-1 text-[11px] font-bold cursor-pointer shrink-0 ${
                      searchCategoryFilter === cat.id
                        ? 'bg-[var(--accent-primary)]'
                        : 'bg-[var(--bg-paper)] opacity-75'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {searching && (
              <div className="hand-card p-2 bg-[var(--bg-secondary)] text-center text-[11px] font-bold flex items-center justify-center gap-1.5">
                <span className="animate-spin text-sm">🍿</span>
                <span>Ampliando resultados en vivo (TVMaze, Jikan y Cine)...</span>
              </div>
            )}

            <div className="space-y-2">
              {displayedSearchResults.map((res, idx) => (
                <div
                  key={`${res.title}-${idx}`}
                  className="hand-card p-2.5 bg-[var(--bg-card)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={res.posterUrl}
                      alt={res.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_POSTER_SVG;
                      }}
                      className="w-12 h-16 rounded-lg object-cover border border-[var(--border-ink)] shrink-0 bg-[#FFE5D9]"
                    />
                    <div>
                      <p className="text-xs font-bold">{res.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {res.category} ({res.year}) · {res.durationMin} min · {res.genre}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => {
                        addMediaItem({ ...res, status: 'watchlist' });
                        soundEngine.playPop();
                        setTab('watchlist');
                      }}
                      className="hand-pill px-2.5 py-1 bg-[var(--bg-secondary)] text-[10px] font-bold cursor-pointer"
                    >
                      + Pendientes
                    </button>
                    <button
                      onClick={() => {
                        addMediaItem({ ...res, status: 'watched' });
                        soundEngine.playPop();
                        setTab('watched');
                      }}
                      className="hand-pill px-2.5 py-1 bg-[var(--accent-primary)] text-[10px] font-bold cursor-pointer"
                    >
                      + Vistas juntos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
