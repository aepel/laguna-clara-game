// Niveles de Laguna Clara: 100 niveles en 10 zonas (ver data/zones.js), armados
// por el generador determinista. Los 8 niveles originales quedan en la historia
// de git (commit a4f7e82).
import { generateCampaign } from './generator.js';

export const LEVELS = generateCampaign();
