# Laguna Clara · mobile (iPhone y Android)

El mismo juego de `../src`, envuelto con [Capacitor](https://capacitorjs.com).
No hay una copia del juego: `src/entry.js` carga los controles táctiles
(`src/touch.js`) y después `../../src/main.js`. Si se borra esta carpeta, el
juego de escritorio sigue igual.

- **Controles:** joystick translúcido a la izquierda (nadar; arriba del todo
  también salta), botones Saltar y Burbuja a la derecha; arriba, FX (efectos), ♪ (música) y ❚❚; en el título, ES/EN cambia el idioma.
  Los textos táctiles salen de `src/i18n.js` (plataforma `touch`). Tocar la pantalla avanza la intro, empieza la partida y, en el título, cambia
  de zona tocando los costados. Un jugador (Nilo).
- **Pantalla:** horizontal, a pantalla completa, 56×26 casillas (2:1).

## Comandos

```bash
npm install
npm run dev        # build + servidor en http://localhost:8767 para probar en el navegador
npm run ios        # build + sync + abre Xcode
npm run android    # build + sync + abre Android Studio
```

Requisitos: Xcode (con `xcode-select` apuntando a Xcode.app) para iOS; Android
Studio con su SDK para Android. El `appId` es `com.lagunaclara.app`
(en `capacitor.config.json`); hay que cambiarlo antes de publicar en las tiendas.
