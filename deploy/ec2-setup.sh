#!/bin/bash
# EC2 첫 부팅(user-data)에서 한 번 실행: Docker·AWS CLI 설치, 빌드용 스왑, 코드 받기.
# 앱 실행은 deploy/ec2-start.sh (SSM으로 원격 실행). Ubuntu 24.04 기준
set -euo pipefail

# t4g.small(메모리 2GB)에서 이미지 빌드가 메모리 부족으로 죽지 않게 스왑 2GB
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

curl -fsSL https://get.docker.com | sh          # Docker + compose·buildx 플러그인
snap install aws-cli --classic                  # Secrets Manager에서 설정을 읽기 위해

git clone https://github.com/doosup/team-attendance-system.git /opt/attendance
