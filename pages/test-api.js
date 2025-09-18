import { useState } from 'react';

export default function TestAPI() {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const testAPI = async (endpoint, method = 'GET', body = null) => {
        setLoading(true);
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(endpoint, options);
            const data = await response.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (error) {
            setResult(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🧪 API 테스트</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => testAPI('/api/init/sample-data', 'POST', {})}>
                    샘플 데이터 생성
                </button>
                <button onClick={() => testAPI('/api/restaurants')}>
                    가게 목록 조회
                </button>
                <button onClick={() => testAPI('/api/users', 'POST', { name: '테스트사용자' })}>
                    사용자 생성
                </button>
                <button onClick={() => testAPI('/api/stats')}>
                    통계 조회
                </button>
            </div>

            {loading && <p>로딩 중...</p>}
            
            <pre style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px',
                overflow: 'auto',
                maxHeight: '500px'
            }}>
                {result || 'API 테스트 결과가 여기에 표시됩니다.'}
            </pre>
        </div>
    );
}