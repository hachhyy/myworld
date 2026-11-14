# 🪐 MyWorld — Nuestro Planeta Privado (Cozy Couple PWA)

Aplicación web progresiva (PWA) interactiva 3D y 2D diseñada para parejas, con estética artesanal de acuarela y bordes orgánicos.

## ✨ Módulos Incluidos (Actualización Maestra V4)
1. **🪐 Planeta 3D Interactivo (Three.js / React Three Fiber):**
   - Esfera suave multicapa estilo *Animal Crossing / Super Mario Galaxy*, ciclo solar en tiempo real (*Día Soleado, Atardecer Rosado, Noche Estrellada*), circuito ferroviario continuo con puente de madera y 7 edificios interactivos.
2. **🏡 La Casita (Salón Tamagotchi Vivo):**
   - Mascotas en primer plano sobre la alfombra central con IA de movimiento autónomo, baño de espuma con esponja (`🧽`), comida arrastrable a la boca (`🍕`, `🍣`, `🍓`, `🧁`), cama con manta en capa superior (`z-30`), tocadiscos *lo-fi* y catálogo visual de muebles.
3. **🍿 El Cine Retro:**
   - Buscador instantáneo (`<1s`) conectado a **TVMaze**, **Jikan (MyAnimeList)**, **iTunes** y catálogo oficial de clásicos de cine, con **Doble Sobre Secreto** de votación y **Ruleta Interactiva**.
4. **🗼 El Faro de Viajes (Mapa 2D + Polaroid):**
   - Mapa interactivo con clavado de chinchetas al tocar, *Reverse Geocoding* con OpenStreetMap Nominatim y visor `<PolaroidUploader />` con encuadre, filtros y celo *washi-tape*.
5. **📮 El Buzón y Diario Postal:**
   - Cartas manuscritas con lienzo de dibujo libre (`perfect-freehand`), fotos Polaroid y exportación a libro PDF.
6. **⛲ La Fuente de Deseos y Antojos + 🐷 Hucha Compartida:**
   - Tickets de antojos/citas y metas de ahorro con hucha de cristal e historial por persona.
7. **🌙 El Invernadero Lunar:**
   - Calendario mensual estilo *Bullet Journal* con registro de reglas y cálculo automático de las 4 fases (*Menstruación, Folicular, Fértil/Ovulación y Lútea*) sincronizado con el **Óvulo Cute**.

---

## 🚀 Despliegue en Vercel

El proyecto incluye `vercel.json` preconfigurado para **Vite**:
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Variables de Entorno Opcionales en Vercel (`Settings -> Environment Variables`):
```env
VITE_SUPABASE_URL=https://rdvunykuoflteuqkzsfb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_iZHf6ya70vhiwwzQwazrvQ_pBqQ2l5-
```
*(El cliente en `src/lib/supabaseClient.ts` ya incluye estos valores por defecto para que funcione desde el primer despliegue).*
