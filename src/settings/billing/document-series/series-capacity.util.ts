// SUNAT exige correlativo de máximo 8 dígitos en el XML UBL.
// Rango utilizable: 1 a 99,999,999. Al superarlo, debe crearse una serie nueva.
export const MAX_CORRELATIVO = 99_999_999;

// Umbral en el que se avisa al admin que la serie se está agotando.
export const NEAR_EXHAUSTION_THRESHOLD = MAX_CORRELATIVO - 1000;

export interface SeriesCapacity {
  isExhausted: boolean;
  isNearExhaustion: boolean;
  remainingCapacity: number;
  maxCorrelativo: number;
}

export function buildCapacity(correlativo: number): SeriesCapacity {
  const remaining = Math.max(0, MAX_CORRELATIVO - correlativo + 1);
  return {
    isExhausted: correlativo > MAX_CORRELATIVO,
    isNearExhaustion:
      correlativo > NEAR_EXHAUSTION_THRESHOLD && correlativo <= MAX_CORRELATIVO,
    remainingCapacity: remaining,
    maxCorrelativo: MAX_CORRELATIVO,
  };
}
