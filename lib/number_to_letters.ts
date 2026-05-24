const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
];

const ESPECIALES = [
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISEIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDOS',
  'VEINTITRES',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISEIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE',
];

const DECENAS = [
  '',
  'DIEZ',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let resultado = '';

  const centenas = Math.floor(n / 100);
  const resto = n % 100;

  if (centenas > 0) {
    resultado = CENTENAS[centenas];
    if (resto === 0) return resultado;
    resultado += ' ';
  }

  if (resto >= 10 && resto <= 29) {
    resultado += ESPECIALES[resto - 10];
  } else {
    const decenas = Math.floor(resto / 10);
    const unidades = resto % 10;

    if (decenas > 0) {
      resultado += DECENAS[decenas];
      if (unidades > 0) {
        resultado += ' Y ' + UNIDADES[unidades];
      }
    } else {
      resultado += UNIDADES[unidades];
    }
  }

  return resultado;
}

/**
 * Convierte un número a su representación en letras en moneda peruana (Soles).
 * Soporta valores desde 0 hasta 999,999,999.99
 *
 * @example
 * numeroALetras(1250.50) // "MIL DOSCIENTOS CINCUENTA Y 50/100 SOLES"
 * numeroALetras(0)       // "CERO Y 00/100 SOLES"
 * numeroALetras(1)       // "UNO Y 00/100 SOLES"
 * numeroALetras(21.10)   // "VEINTIUNO Y 10/100 SOLES"
 */
export function numeroALetras(monto: number): string {
  if (monto < 0 || monto >= 1_000_000_000) {
    throw new RangeError('El monto debe estar entre 0 y 999,999,999.99');
  }

  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');

  if (entero === 0) {
    return `CERO CON ${centavosStr}/100 NUEVOS SOLES`;
  }

  let letras = '';

  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1_000);
  const unidades = entero % 1_000;

  // Millones
  if (millones > 0) {
    if (millones === 1) {
      letras += 'UN MILLON';
    } else {
      letras += convertirGrupo(millones) + ' MILLONES';
    }
  }

  // Miles
  if (miles > 0) {
    if (letras.length > 0) letras += ' ';
    if (miles === 1) {
      letras += 'MIL';
    } else {
      letras += convertirGrupo(miles) + ' MIL';
    }
  }

  // Unidades
  if (unidades > 0) {
    if (letras.length > 0) letras += ' ';
    letras += convertirGrupo(unidades);
  }

  return `${letras} CON ${centavosStr}/100 NUEVOS SOLES`;
}
