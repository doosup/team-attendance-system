import { AllowedIp } from '../entity/allowed-ip.entity';

// 연구실 IP (상시 허용). 소프트 삭제된 IP는 허용·목록에서 빠진다.
export abstract class AllowedIpRepository {
  abstract isAllowed(ip: string): Promise<boolean>;
  abstract findActive(): Promise<AllowedIp[]>;
  abstract create(
    ip: string,
    label: string,
    createdById: number,
  ): Promise<AllowedIp>;
  abstract softDelete(id: number): Promise<void>;
}
