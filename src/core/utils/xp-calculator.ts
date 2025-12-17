/**
 * Utilidades para el cálculo de XP y evolución de peces.
 *
 * Umbrales configurables de XP por estado de pez:
 *
 * - Baby:       0 <= xp < 50
 * - Juvenile:   50 <= xp < 150
 * - YoungAdult: 150 <= xp < 350
 * - Adult:      xp >= 350
 *
 * Estos valores son sugeridos y pueden ajustarse si cambia
 * el diseño del juego. Centralizar aquí evita tener números
 * mágicos repartidos por el código.
 */

import { FishState } from '@/models/fish.model';

export const BABY_MAX_XP = 50;
export const JUVENILE_MAX_XP = 150;
export const YOUNG_ADULT_MAX_XP = 350;


