// Declaración mínima para el printer server-side de pdfmake (no hay @types).
declare module 'pdfmake/src/printer' {
  interface PdfKitDoc extends NodeJS.ReadableStream {
    end(): void;
  }
  type FontDescriptor = Record<
    string,
    { normal: string; bold: string; italics: string; bolditalics: string }
  >;
  class PdfPrinter {
    constructor(fonts: FontDescriptor);
    createPdfKitDocument(
      docDefinition: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): PdfKitDoc;
  }
  export = PdfPrinter;
}
