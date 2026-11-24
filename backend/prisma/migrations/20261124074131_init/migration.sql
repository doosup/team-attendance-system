-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'LEAD');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('FULL_DAY', 'HALF_DAY_OFF', 'EMERGENCY_WORK', 'WEEKEND_WORK');

-- CreateEnum
CREATE TYPE "CheckOutSource" AS ENUM ('BUTTON', 'MANUAL');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('ANNUAL', 'REMOTE', 'HALF_OFF', 'WEEKEND_WORK');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('ACTIVE', 'CANCELED');

-- CreateEnum
CREATE TYPE "CancelType" AS ENUM ('SELF_BEFORE_DEADLINE', 'LEAD_SAME_DAY', 'RETIREMENT');

-- CreateEnum
CREATE TYPE "LeaveKind" AS ENUM ('ANNUAL', 'HALF_OFF');

-- CreateEnum
CREATE TYPE "LedgerEvent" AS ENUM ('ACCRUE', 'USE', 'EXPIRE', 'RESTORE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'MANUAL_CHECK_OUT', 'REQUEST_CREATE', 'REQUEST_CANCEL', 'REQUEST_DAY_CANCEL', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'LOGIN', 'LOGIN_FAIL', 'IP_BLOCKED', 'ALLOWED_IP_ADD', 'ALLOWED_IP_DELETE', 'CLOCK_CHANGE', 'USER_CREATE', 'USER_RETIRE', 'REQUEST_ACCESS_CHANGE', 'PASSWORD_CHANGE');

-- CreateEnum
CREATE TYPE "HalfOffPart" AS ENUM ('AM', 'PM');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "joinDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workDate" TEXT NOT NULL,
    "dayType" "DayType" NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "checkOutSource" "CheckOutSource",
    "isLate" BOOLEAN NOT NULL,
    "isEarlyLeave" BOOLEAN,
    "workedMinutes" INTEGER,
    "requestDayId" INTEGER,
    "checkInIp" TEXT NOT NULL,
    "checkOutIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "RequestType" NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "isOverLimit" BOOLEAN NOT NULL,
    "isAfterDeadline" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "ip" TEXT,
    "halfOffPart" "HalfOffPart",
    "startTime" TEXT,
    "endTime" TEXT,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "accessChangedAt" TIMESTAMP(3),
    "accessChangedById" INTEGER,
    "accessChangeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDay" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "status" "DayStatus" NOT NULL,
    "cancelType" "CancelType",
    "canceledById" INTEGER,
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedger" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "LeaveKind" NOT NULL,
    "event" "LedgerEvent" NOT NULL,
    "halfDays" INTEGER NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "expiresOn" TEXT,
    "grantId" INTEGER,
    "requestDayId" INTEGER,
    "dedupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" INTEGER,
    "payload" JSONB NOT NULL,
    "ip" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedIp" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AllowedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_requestDayId_key" ON "Attendance"("requestDayId");

-- CreateIndex
CREATE INDEX "Attendance_workDate_idx" ON "Attendance"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_workDate_key" ON "Attendance"("userId", "workDate");

-- CreateIndex
CREATE INDEX "Request_userId_status_idx" ON "Request"("userId", "status");

-- CreateIndex
CREATE INDEX "Request_status_startDate_idx" ON "Request"("status", "startDate");

-- CreateIndex
CREATE INDEX "RequestDay_userId_date_status_idx" ON "RequestDay"("userId", "date", "status");

-- CreateIndex
CREATE INDEX "RequestDay_date_status_idx" ON "RequestDay"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveLedger_dedupKey_key" ON "LeaveLedger"("dedupKey");

-- CreateIndex
CREATE INDEX "LeaveLedger_userId_kind_idx" ON "LeaveLedger"("userId", "kind");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_occurredAt_idx" ON "AuditLog"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_requestDayId_fkey" FOREIGN KEY ("requestDayId") REFERENCES "RequestDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_accessChangedById_fkey" FOREIGN KEY ("accessChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDay" ADD CONSTRAINT "RequestDay_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDay" ADD CONSTRAINT "RequestDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDay" ADD CONSTRAINT "RequestDay_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "LeaveLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_requestDayId_fkey" FOREIGN KEY ("requestDayId") REFERENCES "RequestDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowedIp" ADD CONSTRAINT "AllowedIp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
