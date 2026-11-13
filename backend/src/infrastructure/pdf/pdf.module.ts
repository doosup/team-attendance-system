import { Global, Module } from '@nestjs/common';
import { RequestPdfRenderer } from '../../domain/port/request-pdf.port';
import { PdfkitRequestPdfRenderer } from './pdfkit-request-pdf.renderer';

@Global()
@Module({
  providers: [
    { provide: RequestPdfRenderer, useClass: PdfkitRequestPdfRenderer },
  ],
  exports: [RequestPdfRenderer],
})
export class PdfModule {}
