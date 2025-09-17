const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI가 환경변수에 설정되지 않았습니다.');
    console.log('📝 .env.local 파일을 생성하고 MongoDB 연결 문자열을 설정하세요.');
    process.exit(1);
}

async function initDatabase() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('🔄 MongoDB 연결 중...');
        await client.connect();
        
        const db = client.db();
        console.log('✅ MongoDB 연결 성공!');
        
        // 컬렉션 생성 및 인덱스 설정
        const collections = [
            {
                name: 'users',
                indexes: [
                    { key: { name: 1 }, options: { unique: true } },
                    { key: { email: 1 }, options: { sparse: true } }
                ]
            },
            {
                name: 'restaurants',
                indexes: [
                    { key: { name: 1, isActive: 1 } },
                    { key: { category: 1, isActive: 1 } },
                    { key: { createdAt: -1 } }
                ]
            },
            {
                name: 'visits',
                indexes: [
                    { key: { userId: 1, visitedAt: -1 } },
                    { key: { restaurantId: 1, visitedAt: -1 } },
                    { key: { visitedAt: -1 } }
                ]
            },
            {
                name: 'selections',
                indexes: [
                    { key: { selectedAt: -1 } },
                    { key: { userId: 1, selectedAt: -1 } }
                ]
            }
        ];
        
        for (const collection of collections) {
            console.log(`📋 ${collection.name} 컬렉션 설정 중...`);
            
            const coll = db.collection(collection.name);
            
            // 인덱스 생성
            for (const index of collection.indexes) {
                try {
                    await coll.createIndex(index.key, index.options || {});
                    console.log(`  ✅ 인덱스 생성: ${JSON.stringify(index.key)}`);
                } catch (error) {
                    if (error.code !== 85) { // 인덱스가 이미 존재하는 경우 무시
                        console.log(`  ⚠️  인덱스 생성 실패: ${error.message}`);
                    }
                }
            }
        }
        
        console.log('🎉 데이터베이스 초기화 완료!');
        console.log('');
        console.log('📖 다음 단계:');
        console.log('1. npm run dev 로 개발 서버 시작');
        console.log('2. http://localhost:3000/api/init/sample-data 에 POST 요청으로 샘플 데이터 추가');
        console.log('3. 또는 앱에서 직접 가게 데이터 추가');
        
    } catch (error) {
        console.error('❌ 데이터베이스 초기화 실패:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

initDatabase();