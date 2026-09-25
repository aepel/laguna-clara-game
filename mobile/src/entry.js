// Los controles táctiles se cargan antes que el juego: parchean AudioContext y
// los textos de teclas, y después el juego arranca igual que en escritorio.
import './touch.js';
import '../../src/main.js';
