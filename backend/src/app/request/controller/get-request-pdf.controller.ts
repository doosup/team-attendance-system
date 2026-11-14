import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  StreamableFile,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { GetRequestPdfUseCase } from '../use-case/get-request-pdf.use-case';

@Controller('requests/:id/pdf')
export class GetRequestPdfController {
  constructor(private readonly useCase: GetRequestPdfUseCase) {}

  // 파일 자체로 응답한다 (ResponseInterceptor가 StreamableFile은 { data }로 감싸지 않음)
  @Get()
  async getPdf(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) requestId: number,
  ): Promise<StreamableFile> {
    const pdf = await this.useCase.execute({ user, requestId });
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      // 화면(download 속성)과 같은 이름. 한글이라 RFC 5987 filename*, 옛 클라이언트용 ASCII 이름도 함께
      disposition: `attachment; filename="request-${requestId}.pdf"; filename*=UTF-8''${encodeURIComponent(`신청서-${requestId}.pdf`)}`,
    });
  }
}
