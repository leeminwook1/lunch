# 🍽️ 점심메뉴 선택기

회사에서 점심 가게를 랜덤으로 선택해주는 다중 사용자 지원 Next.js 앱입니다.

## ✨ 주요 기능

### 👥 다중 사용자 지원
- 🔐 사용자별 개인 방문기록 관리
- 🤝 공유 가게 데이터베이스
- ⏰ 실시간 최근 선택 정보
- 📊 개인/전체 통계 분리



### 🎲 핵심 기능
- **랜덤 가게 선택**: 스피닝 애니메이션과 함께 재미있는 선택 경험
- **가게 관리**: 추가/삭제/수정 (이름, 거리, 카테고리, 이미지, 설명, 웹사이트)
- **카테고리별 필터링**: 한식, 중식, 일식, 양식, 분식, 치킨, 카페, 베트남식, 기타
- **다양한 정렬**: 이름순/거리순/최신순
- **가게 상세보기**: 상세 정보, 리뷰, 평점 시스템
- **리뷰 시스템**: 별점과 텍스트 리뷰 작성 및 조회
- **게임 기능**: 슬롯머신, 월드컵 게임
- **피드백 시스템**: 사용자 의견 수집 및 관리

### 📱 사용자 경험
- **현대적 디자인**: 그라데이션과 글래스모피즘 효과
- **반응형 웹 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- **직관적인 UI**: 카드 기반 레이아웃과 명확한 액션 버튼
- **부드러운 애니메이션**: 호버 효과와 전환 애니메이션
- **접근성 고려**: 키보드 네비게이션, 스크린 리더 지원

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치
```bash
git clone https://github.com/leeminwook1/lunch.git
cd lunch
npm install
```

### 2. 환경 변수 설정
```bash
# .env.local 파일 생성
cp .env.example .env.local

# MongoDB Atlas 연결 문자열 설정
# .env.local 파일을 열어서 MONGODB_URI 값을 실제 MongoDB 연결 문자열로 변경
```

### 3. MongoDB Atlas 설정 (무료)
1. [MongoDB Atlas](https://www.mongodb.com/atlas) 가입
2. 무료 클러스터 생성 (512MB 무료)
3. Database User 생성
4. Network Access에서 IP 허용 (0.0.0.0/0 또는 특정 IP)
5. 연결 문자열 복사하여 .env.local에 설정

### 4. TypeScript 설정 (선택사항)
```bash
# TypeScript 의존성이 이미 설치되어 있습니다
# 점진적으로 .js 파일을 .ts/.tsx로 변환할 수 있습니다
```

### 5. 데이터베이스 초기화
```bash
# 데이터베이스 인덱스 생성
npm run db:init
```

### 6. 개발 서버 실행
```bash
npm run dev
```

### 7. 샘플 데이터 추가 (선택사항)
브라우저에서 다음 URL에 POST 요청:
```
POST http://localhost:3000/api/init/sample-data
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 📡 API 엔드포인트

### 사용자 관리
- `GET /api/users` - 사용자 목록 조회
- `POST /api/users` - 사용자 생성/로그인

### 가게 관리
- `GET /api/restaurants` - 가게 목록 조회
- `POST /api/restaurants` - 가게 추가
- `GET /api/restaurants/[id]` - 가게 상세 조회
- `PUT /api/restaurants/[id]` - 가게 수정
- `DELETE /api/restaurants/[id]` - 가게 삭제
- `POST /api/restaurants/random` - 랜덤 가게 선택

### 방문 기록
- `GET /api/visits` - 방문 기록 조회
- `POST /api/visits` - 방문 기록 추가

### 선택 기록
- `GET /api/selections` - 선택 기록 조회
- `POST /api/selections` - 선택 기록 추가

### 통계
- `GET /api/stats` - 전체/개인 통계 조회

### 초기화
- `POST /api/init/sample-data` - 샘플 데이터 생성

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 13, React 18
- **Language**: JavaScript (TypeScript 준비 완료)
- **Styling**: CSS3 (Flexbox, Grid, 반응형 디자인)
- **Icons**: 이모지 기반 아이콘 시스템
- **State Management**: React Hooks (커스텀 훅 활용)

### Backend
- **API**: Next.js API Routes
- **Database**: MongoDB (Mongoose ODM)
- **Validation**: Zod 스키마 검증
- **Security**: 레이트 리미팅, 입력 검증, CORS
- **Hosting**: MongoDB Atlas (무료 티어 512MB)

### 개발 도구
- **Linting**: ESLint
- **Type Checking**: TypeScript (설정 완료)
- **Error Handling**: Error Boundary
- **Analytics**: 간단한 클라이언트 사이드 분석

## 📖 사용법

### 첫 사용
1. **사용자 설정**: 첫 방문 시 사용자 이름 입력
2. **가게 추가**: 새로운 점심 가게 정보 등록
3. **랜덤 선택**: 스피닝 애니메이션으로 가게 선택

### 주요 기능
- **🎯 랜덤 선택**: 필터 조건에 맞는 가게 중 랜덤 선택
- **🔍 필터링**: 카테고리별, 거리별 가게 필터링
- **📊 통계**: 개인 방문 기록 및 전체 선택 통계
- **👤 사용자 관리**: 사용자 변경 및 개인 데이터 관리

## 🏪 기본 제공 가게

- **한식**: 김밥천국, 한솥도시락, 백반집
- **중식**: 중국집 홍루, 짜장면집
- **일식**: 스시로, 라멘집
- **양식**: 맘스터치, 버거킹, 파스타집
- **분식**: 떡볶이집, 김밥나라
- **치킨**: 교촌치킨, BBQ, 네네치킨
- **카페**: 스타벅스, 이디야, 카페베네

## 💾 데이터베이스 구조

### Collections
- **users**: 사용자 정보 (이름, 이메일, 로그인 시간)
- **restaurants**: 가게 정보 (이름, 거리, 카테고리, 이미지, 설명)
- **visits**: 개인 방문 기록 (사용자별 방문 히스토리)
- **selections**: 공유 선택 기록 (전체 사용자 선택 히스토리)

### 데이터 분리
- **공유 데이터**: 가게 목록, 선택 기록 (모든 사용자 공통)
- **개인 데이터**: 방문 기록, 사용자 설정 (사용자별 분리)
- **실시간 데이터**: 최근 선택 정보 (전체 공유)

### 인덱스 최적화
- 사용자별 방문 기록 조회 최적화
- 카테고리별 가게 검색 최적화
- 최신 선택 기록 조회 최적화

## 🎨 디자인 특징

- **모던 UI**: 그라데이션과 그림자 효과
- **반응형**: 모바일, 태블릿, 데스크톱 최적화
- **애니메이션**: 부드러운 전환 효과
- **접근성**: 키보드 네비게이션 지원
