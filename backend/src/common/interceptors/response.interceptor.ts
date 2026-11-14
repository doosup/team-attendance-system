import {
  CallHandler,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map } from 'rxjs';

// 모든 성공 응답을 { data }로 감싼다. 파일(신청서 PDF)은 그대로 내보낸다.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler) {
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data instanceof StreamableFile ? data : { data },
        ),
      );
  }
}
