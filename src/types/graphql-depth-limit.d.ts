declare module 'graphql-depth-limit' {
  import { ValidationRule } from 'graphql';

  /**
   * Crea una regla de validación que rechaza queries cuya profundidad de
   * anidamiento supere `maxDepth` (mitiga DoS por queries profundas).
   */
  export default function depthLimit(
    maxDepth: number,
    options?: { ignore?: (string | RegExp)[] },
    callback?: (depths: Record<string, number>) => void,
  ): ValidationRule;
}
