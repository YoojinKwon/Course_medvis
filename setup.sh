#!/bin/bash

# MedVis 자동 설정 스크립트
# 이 스크립트는 개발 환경을 자동으로 설정합니다

set -e  # 오류 발생 시 스크립트 중단

echo "================================"
echo "🏥 MedVis 개발 환경 설정"
echo "================================"
echo ""

# 1. Conda 환경 확인
echo "📦 Step 1: Conda 환경 생성 중..."
if conda env list | grep -q medvis; then
    echo "   ⚠️  medvis 환경이 이미 존재합니다."
    read -p "   기존 환경을 삭제하고 다시 생성하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        conda env remove -n medvis
        conda env create -f environment-base.yml
        echo "   ✅ 새로운 medvis 환경이 생성되었습니다"
    fi
else
    conda env create -f environment-base.yml
    echo "   ✅ medvis 환경이 생성되었습니다"
fi
echo ""

# 2. Backend 설정
echo "🔧 Step 2: Backend 의존성 설치 중..."
cd backend
eval "$(conda shell.bash hook)"
conda activate medvis
pip install -r requirements.txt
cd ..
echo "   ✅ Backend 의존성 설치 완료"
echo ""

# 3. Frontend 설정
echo "⚛️  Step 3: Frontend 의존성 설치 중..."
cd frontend
npm install
cd ..
echo "   ✅ Frontend 의존성 설치 완료"
echo ""

# 4. Database 설정
echo "🗄️  Step 4: Database 초기화 중..."
cd database
pip install -r requirements.txt
python init_db.py
cd ..
echo "   ✅ Database 초기화 완료"
echo ""

# 5. 환경변수 파일 생성
echo "🔐 Step 5: 환경변수 파일 설정"
if [ ! -f backend/.env ]; then
    echo "   → backend/.env 파일 생성 중..."
    cp backend/.env.example backend/.env 2>/dev/null || \
    cat > backend/.env << 'EOF'
DATABASE_URL=sqlite:///medvis.db
FLASK_ENV=development
API_PORT=5000
FLASK_DEBUG=1
EOF
    echo "   ✅ backend/.env 생성 완료 (내용을 확인하고 필요시 수정하세요)"
else
    echo "   ℹ️  backend/.env가 이미 존재합니다"
fi

if [ ! -f frontend/.env ]; then
    echo "   → frontend/.env 파일 생성 중..."
    cp frontend/.env.example frontend/.env 2>/dev/null || \
    cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:5000
EOF
    echo "   ✅ frontend/.env 생성 완료"
else
    echo "   ℹ️  frontend/.env가 이미 존재합니다"
fi
echo ""

# 6. 완료
echo "================================"
echo "✅ 설정이 완료되었습니다!"
echo "================================"
echo ""
echo "🚀 다음 단계:"
echo ""
echo "1️⃣  Conda 환경 활성화:"
echo "   conda activate medvis"
echo ""
echo "2️⃣  Backend 시작 (터미널 1):"
echo "   cd backend && python app.py"
echo "   → http://localhost:5000"
echo ""
echo "3️⃣  Frontend 시작 (터미널 2):"
echo "   cd frontend && npm run dev"
echo "   → http://localhost:5174"
echo ""
echo "📚 더 자세한 정보는 docs/SETUP.md를 참고하세요"
echo ""
