export interface AllowedIp {
  id: number;
  ip: string; // 정규화된 값
  label: string;
  createdById: number | null;
  createdAt: Date;
}
