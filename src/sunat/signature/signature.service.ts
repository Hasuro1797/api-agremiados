import { Injectable } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';

@Injectable()
export class SignatureService {
  /**
   * Extrae la clave privada (PEM) y el certificado (PEM) de un archivo PFX/P12.
   */
  private extractFromPfx(
    pfxBuffer: Buffer,
    password: string,
  ): { privateKeyPem: string; certificatePem: string } {
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

    // Extraer clave privada
    const keyBags = pfx.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key ??
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

    if (!keyBag) {
      throw new Error('No se encontró la clave privada en el archivo PFX');
    }

    const privateKeyPem = forge.pki.privateKeyToPem(
      keyBag as forge.pki.PrivateKey,
    );

    // Extraer certificado
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0]?.cert;

    if (!certBag) {
      throw new Error('No se encontró el certificado en el archivo PFX');
    }

    const certificatePem = forge.pki.certificateToPem(certBag);

    return { privateKeyPem, certificatePem };
  }

  signXml(
    xmlString: string,
    pfxBuffer: Buffer,
    password: string,
    rootElement: 'Invoice' | 'CreditNote' | 'DebitNote' = 'Invoice',
  ): { signedXml: string; hash: string } {
    // 1. Extraer clave privada y certificado del PFX
    const { privateKeyPem, certificatePem } = this.extractFromPfx(
      pfxBuffer,
      password,
    );

    // 2. Configurar el firmante
    const signer = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certificatePem,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    });

    // 3. Parsear el XML para validar estructura
    new DOMParser().parseFromString(xmlString, 'text/xml');

    // 4. Referencia al documento completo (URI="" = todo el documento)
    //    Transform 1: enveloped-signature excluye el elemento Signature del digest.
    //    Transform 2: exc-c14n garantiza canonicalización consistente de atributos
    //    (workaround para bug de xml-crypto con atributos no ordenados).
    signer.addReference({
      xpath: `//*[local-name(.)='${rootElement}']`,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      isEmptyUri: true,
    });

    // 5. Firmar y colocar la firma dentro de ext:ExtensionContent
    signer.computeSignature(xmlString, {
      location: {
        reference: "//*[local-name(.)='ExtensionContent']",
        action: 'append',
      },
    });

    return {
      signedXml: signer.getSignedXml(),
      hash: signer.getSignatureXml(),
    };
  }
}
