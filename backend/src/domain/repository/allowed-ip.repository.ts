// 연구실 IP (상시 허용). 소프트 삭제된 IP는 허용하지 않는다.
export abstract class AllowedIpRepository {
  abstract isAllowed(ip: string): Promise<boolean>;
}
