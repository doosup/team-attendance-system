import { IsInt, IsString } from 'class-validator';
import { CustomException } from '../../domain/exception/custom.exception';
import { validationPipe } from './validation.pipe';

class SampleRequest {
  @IsString()
  name!: string;

  @IsInt()
  age!: number;
}

const run = (body: unknown) =>
  validationPipe.transform(body, { type: 'body', metatype: SampleRequest });

const failureOf = async (body: unknown): Promise<CustomException> => {
  try {
    await run(body);
  } catch (e) {
    return e as CustomException;
  }
  throw new Error('검증이 통과해 버렸다');
};

describe('validationPipe', () => {
  it('올바른 입력은 DTO 인스턴스로 바꿔 넘긴다', async () => {
    const result: unknown = await run({ name: '김근태', age: 30 });
    expect(result).toBeInstanceOf(SampleRequest);
  });

  it('정의하지 않은 필드가 있으면 VALIDATION_FAILED로 거부한다', async () => {
    const e = await failureOf({ name: '김근태', age: 30, role: 'LEAD' });
    expect(e).toBeInstanceOf(CustomException);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.message).toContain('role');
  });

  it('여러 필드가 틀리면 메시지를 모두 합쳐 알려 준다', async () => {
    const e = await failureOf({ name: 1, age: 'x' });
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.message).toContain('name');
    expect(e.message).toContain('age');
  });
});
