import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaService } from './prisma.service';

// 저장소는 이것만 주입받는다: use-case의 @Transactional() 안이면 같은 트랜잭션, 밖이면 일반 클라이언트.
export type PrismaTx = TransactionHost<
  TransactionalAdapterPrisma<PrismaService>
>;
