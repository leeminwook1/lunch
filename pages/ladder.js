import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LadderGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 사다리 게임 상태
    const [gameState, setGameState] = useState('setup'); // setup, selectRestaurants, ready, playing, result
    const [numPlayers, setNumPlayers] = useState(3);
    const [playerNames, setPlayerNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3']);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [ladderPaths, setLadderPaths] = useState([]);
    const [animatingPath, setAnimatingPath] = useState([]);
    const [animatingCol, setAnimatingCol] = useState(null);
    const [results, setResults] = useState([]);
    const [selectedRestaurants, setSelectedRestaurants] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [playedPlayers, setPlayedPlayers] = useState([]); // 이미 탄 플레이어들
    const [playerResults, setPlayerResults] = useState({}); // 각 플레이어의 결과

    // 사다리 설정
    const LADDER_HEIGHT = 400;
    const LADDER_TOP = 100;
    const LADDER_BOTTOM = LADDER_TOP + LADDER_HEIGHT;
    const MIN_RUNGS = 8;
    const MAX_RUNGS = 15;

    // API 호출 함수
    const apiCall = async (endpoint, options = {}) => {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            showModal('error', '오류', `API 호출 중 오류가 발생했습니다: ${error.message}`);
            throw error;
        }
    };

    // 모달 표시
    const showModal = (type, title, message, onConfirm = null) => {
        setModal({ isOpen: true, type, title, message, onConfirm });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    };

    // 사용자 정보 가져오기
    useEffect(() => {
        const savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
        const savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');

        if (savedUserId && savedUserName) {
            setCurrentUser({ _id: savedUserId, name: savedUserName });
        }
    }, []);

    // 가게 목록 가져오기
    useEffect(() => {
        const fetchRestaurants = async () => {
            setLoading(true);
            try {
                const data = await apiCall('/api/restaurants');
                if (data.success) {
                    setRestaurants(data.data || []);
                }
            } catch (error) {
                console.error('가게 목록 가져오기 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRestaurants();
    }, []);

    // 플레이어 수 변경
    const handlePlayerCountChange = (count) => {
        setNumPlayers(count);
        const newNames = Array.from({ length: count }, (_, i) => 
            playerNames[i] || `플레이어 ${i + 1}`
        );
        setPlayerNames(newNames);
    };

    // 플레이어 이름 변경
    const handlePlayerNameChange = (index, name) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    // 가게 선택 토글
    const toggleRestaurantSelection = (restaurant) => {
        if (selectedRestaurants.find(r => r._id === restaurant._id)) {
            setSelectedRestaurants(selectedRestaurants.filter(r => r._id !== restaurant._id));
        } else {
            if (selectedRestaurants.length < numPlayers) {
                setSelectedRestaurants([...selectedRestaurants, restaurant]);
            }
        }
    };

    // 가게 선택 완료
    const confirmRestaurantSelection = () => {
        if (selectedRestaurants.length !== numPlayers) {
            showModal('error', '오류', `정확히 ${numPlayers}개의 가게를 선택해주세요.`);
            return;
        }
        generateLadder();
    };

    // 사다리 생성
    const generateLadder = () => {
        // 랜덤 가로선 생성
        const numRungs = Math.floor(Math.random() * (MAX_RUNGS - MIN_RUNGS + 1)) + MIN_RUNGS;
        const rungs = [];
        
        for (let i = 0; i < numRungs; i++) {
            const y = LADDER_TOP + (LADDER_HEIGHT / (numRungs + 1)) * (i + 1);
            const startCol = Math.floor(Math.random() * (numPlayers - 1));
            rungs.push({ y, startCol, endCol: startCol + 1 });
        }

        setLadderPaths(rungs);
        
        // 선택한 가게를 랜덤으로 섞어서 배치
        const shuffledRestaurants = [...selectedRestaurants]
            .sort(() => Math.random() - 0.5);
        setResults(shuffledRestaurants);
        
        setGameState('ready');
    };

    // 사다리 그리기
    const drawLadder = (ctx, width, spacing, rungs, highlightPath = [], highlightCol = null, currentPlayedPlayers = []) => {
        ctx.clearRect(0, 0, width, LADDER_BOTTOM + 100);

        // 세로선 그리기
        for (let i = 0; i < numPlayers; i++) {
            const x = spacing * (i + 1);
            const isHighlighted = highlightCol === i;
            ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#cbd5e1';
            ctx.lineWidth = isHighlighted ? 4 : 3;
            ctx.beginPath();
            ctx.moveTo(x, LADDER_TOP);
            ctx.lineTo(x, LADDER_BOTTOM);
            ctx.stroke();

            // 플레이어 이름 (클릭 가능하게 강조)
            const hasPlayed = currentPlayedPlayers.includes(i);
            
            // 배경 박스
            if (!hasPlayed && gameState === 'ready') {
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x - 50, LADDER_TOP - 35, 100, 25);
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 50, LADDER_TOP - 35, 100, 25);
            } else if (hasPlayed) {
                ctx.fillStyle = '#9ca3af';
                ctx.fillRect(x - 50, LADDER_TOP - 35, 100, 25);
            }
            
            ctx.fillStyle = hasPlayed ? '#ffffff' : (gameState === 'ready' ? '#ffffff' : '#1e293b');
            ctx.font = hasPlayed ? 'bold 12px sans-serif' : 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(hasPlayed ? `✓ ${playerNames[i]}` : playerNames[i], x, LADDER_TOP - 18);
        }

        // 가로선 그리기
        rungs.forEach((rung, index) => {
            const x1 = spacing * (rung.startCol + 1);
            const x2 = spacing * (rung.endCol + 1);
            
            const isHighlighted = highlightPath.includes(index);
            ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#cbd5e1';
            ctx.lineWidth = isHighlighted ? 4 : 3;
            
            ctx.beginPath();
            ctx.moveTo(x1, rung.y);
            ctx.lineTo(x2, rung.y);
            ctx.stroke();
        });

        // 결과 표시
        results.forEach((restaurant, i) => {
            const x = spacing * (i + 1);
            
            // 이 위치에 도달한 플레이어가 있는지 확인
            let revealedByPlayer = null;
            for (let playerIdx = 0; playerIdx < numPlayers; playerIdx++) {
                if (currentPlayedPlayers.includes(playerIdx)) {
                    const { endCol } = calculatePath(playerIdx);
                    if (endCol === i) {
                        revealedByPlayer = playerIdx;
                        break;
                    }
                }
            }
            
            if (gameState === 'result' || revealedByPlayer !== null) {
                // 결과 공개
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(restaurant.name, x, LADDER_BOTTOM + 30);
                
                // 플레이어가 탄 경우 플레이어 이름도 표시
                if (revealedByPlayer !== null && gameState !== 'result') {
                    ctx.fillStyle = '#3b82f6';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText(`(${playerNames[revealedByPlayer]})`, x, LADDER_BOTTOM + 45);
                }
            } else {
                // 가려진 상태 - 물음표 박스
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(x - 40, LADDER_BOTTOM + 10, 80, 30);
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 40, LADDER_BOTTOM + 10, 80, 30);
                ctx.fillStyle = '#6b7280';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText('?', x, LADDER_BOTTOM + 33);
            }
        });
    };

    // 경로 계산
    const calculatePath = (startCol) => {
        let currentCol = startCol;
        const path = [];
        
        // 가로선을 y 좌표 순서대로 정렬 (위에서 아래로)
        const sortedRungs = ladderPaths
            .map((rung, index) => ({ ...rung, originalIndex: index }))
            .sort((a, b) => a.y - b.y);

        sortedRungs.forEach((rung) => {
            // 현재 세로선이 이 가로선과 연결되어 있는지 확인
            if (rung.startCol === currentCol) {
                path.push(rung.originalIndex);
                currentCol = rung.endCol;
            } else if (rung.endCol === currentCol) {
                path.push(rung.originalIndex);
                currentCol = rung.startCol;
            }
        });

        return { path, endCol: currentCol };
    };

    // 사다리 타기 시작
    const startLadder = async (playerIndex) => {
        if (isAnimating) return;
        if (playedPlayers.includes(playerIndex)) {
            showModal('info', '알림', '이미 사다리를 탄 플레이어입니다.');
            return;
        }

        setSelectedPlayer(playerIndex);
        setIsAnimating(true);
        setGameState('playing');

        const { path, endCol } = calculatePath(playerIndex);
        
        // 애니메이션
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const spacing = width / (numPlayers + 1);

        // 경로를 y 좌표 순서대로 정렬
        const sortedPath = path.map(idx => ({
            index: idx,
            rung: ladderPaths[idx]
        })).sort((a, b) => a.rung.y - b.rung.y);

        let currentCol = playerIndex;
        let currentY = LADDER_TOP;
        
        // 애니메이션 단계별로 진행
        for (let i = 0; i <= sortedPath.length; i++) {
            const targetY = i < sortedPath.length ? sortedPath[i].rung.y : LADDER_BOTTOM;
            const steps = 20; // 부드러운 애니메이션을 위한 스텝 수
            
            // 세로선을 따라 내려가기
            for (let step = 0; step <= steps; step++) {
                await new Promise(resolve => setTimeout(resolve, 15));
                const y = currentY + (targetY - currentY) * (step / steps);
                
                // 캔버스 다시 그리기
                ctx.clearRect(0, 0, width, LADDER_BOTTOM + 100);
                
                // 모든 세로선 그리기 (회색)
                for (let j = 0; j < numPlayers; j++) {
                    const x = spacing * (j + 1);
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x, LADDER_TOP);
                    ctx.lineTo(x, LADDER_BOTTOM);
                    ctx.stroke();
                    
                    // 플레이어 이름
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(playerNames[j], x, LADDER_TOP - 20);
                }
                
                // 모든 가로선 그리기
                ladderPaths.forEach((rung, idx) => {
                    const x1 = spacing * (rung.startCol + 1);
                    const x2 = spacing * (rung.endCol + 1);
                    const isHighlighted = sortedPath.slice(0, i).some(p => p.index === idx);
                    
                    ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#cbd5e1';
                    ctx.lineWidth = isHighlighted ? 4 : 3;
                    ctx.beginPath();
                    ctx.moveTo(x1, rung.y);
                    ctx.lineTo(x2, rung.y);
                    ctx.stroke();
                });
                
                // 지나온 경로 그리기 (파란색 세로선)
                let pathCol = playerIndex;
                let pathY = LADDER_TOP;
                
                for (let j = 0; j < i; j++) {
                    const pathRung = sortedPath[j].rung;
                    const x = spacing * (pathCol + 1);
                    
                    // 세로선
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(x, pathY);
                    ctx.lineTo(x, pathRung.y);
                    ctx.stroke();
                    
                    // 가로선
                    const x1 = spacing * (pathRung.startCol + 1);
                    const x2 = spacing * (pathRung.endCol + 1);
                    ctx.beginPath();
                    ctx.moveTo(x1, pathRung.y);
                    ctx.lineTo(x2, pathRung.y);
                    ctx.stroke();
                    
                    pathY = pathRung.y;
                    pathCol = pathRung.startCol === pathCol ? pathRung.endCol : pathRung.startCol;
                }
                
                // 현재 진행 중인 세로선
                const x = spacing * (currentCol + 1);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, currentY);
                ctx.lineTo(x, y);
                ctx.stroke();
                
                // 움직이는 아이콘
                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('👤', x, y);
                
                // 결과 박스 (물음표)
                results.forEach((restaurant, idx) => {
                    const rx = spacing * (idx + 1);
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(rx - 40, LADDER_BOTTOM + 10, 80, 30);
                    ctx.strokeStyle = '#d1d5db';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(rx - 40, LADDER_BOTTOM + 10, 80, 30);
                    ctx.fillStyle = '#6b7280';
                    ctx.font = 'bold 20px sans-serif';
                    ctx.fillText('?', rx, LADDER_BOTTOM + 33);
                });
            }
            
            // 가로선을 만나면 이동
            if (i < sortedPath.length) {
                const rung = sortedPath[i].rung;
                const fromX = spacing * (currentCol + 1);
                const toCol = rung.startCol === currentCol ? rung.endCol : rung.startCol;
                const toX = spacing * (toCol + 1);
                const steps = 15;
                
                for (let step = 0; step <= steps; step++) {
                    await new Promise(resolve => setTimeout(resolve, 15));
                    const x = fromX + (toX - fromX) * (step / steps);
                    
                    // 캔버스 다시 그리기 (위와 동일한 로직)
                    ctx.clearRect(0, 0, width, LADDER_BOTTOM + 100);
                    
                    // 모든 세로선
                    for (let j = 0; j < numPlayers; j++) {
                        const sx = spacing * (j + 1);
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(sx, LADDER_TOP);
                        ctx.lineTo(sx, LADDER_BOTTOM);
                        ctx.stroke();
                        
                        ctx.fillStyle = '#1e293b';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(playerNames[j], sx, LADDER_TOP - 20);
                    }
                    
                    // 모든 가로선
                    ladderPaths.forEach((r, idx) => {
                        const x1 = spacing * (r.startCol + 1);
                        const x2 = spacing * (r.endCol + 1);
                        const isHighlighted = sortedPath.slice(0, i + 1).some(p => p.index === idx);
                        
                        ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#cbd5e1';
                        ctx.lineWidth = isHighlighted ? 4 : 3;
                        ctx.beginPath();
                        ctx.moveTo(x1, r.y);
                        ctx.lineTo(x2, r.y);
                        ctx.stroke();
                    });
                    
                    // 지나온 경로
                    let pathCol = playerIndex;
                    let pathY = LADDER_TOP;
                    
                    for (let j = 0; j <= i; j++) {
                        const pathRung = sortedPath[j].rung;
                        const px = spacing * (pathCol + 1);
                        
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(px, pathY);
                        ctx.lineTo(px, pathRung.y);
                        ctx.stroke();
                        
                        if (j < i) {
                            const x1 = spacing * (pathRung.startCol + 1);
                            const x2 = spacing * (pathRung.endCol + 1);
                            ctx.beginPath();
                            ctx.moveTo(x1, pathRung.y);
                            ctx.lineTo(x2, pathRung.y);
                            ctx.stroke();
                        } else {
                            // 현재 가로선 (부분적으로)
                            const startX = spacing * (currentCol + 1);
                            ctx.beginPath();
                            ctx.moveTo(startX, pathRung.y);
                            ctx.lineTo(x, pathRung.y);
                            ctx.stroke();
                        }
                        
                        pathY = pathRung.y;
                        pathCol = pathRung.startCol === pathCol ? pathRung.endCol : pathRung.startCol;
                    }
                    
                    // 움직이는 아이콘
                    ctx.fillStyle = '#3b82f6';
                    ctx.font = 'bold 24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('👤', x, targetY);
                    
                    // 결과 박스
                    results.forEach((restaurant, idx) => {
                        const rx = spacing * (idx + 1);
                        ctx.fillStyle = '#f3f4f6';
                        ctx.fillRect(rx - 40, LADDER_BOTTOM + 10, 80, 30);
                        ctx.strokeStyle = '#d1d5db';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(rx - 40, LADDER_BOTTOM + 10, 80, 30);
                        ctx.fillStyle = '#6b7280';
                        ctx.font = 'bold 20px sans-serif';
                        ctx.fillText('?', rx, LADDER_BOTTOM + 33);
                    });
                }
                
                currentCol = toCol;
                currentY = targetY;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 플레이어 결과 저장
        const selectedRestaurant = results[endCol];
        const newPlayerResults = { ...playerResults, [playerIndex]: selectedRestaurant };
        setPlayerResults(newPlayerResults);
        const newPlayedPlayers = [...playedPlayers, playerIndex];
        setPlayedPlayers(newPlayedPlayers);
        
        // 최종 결과 그리기 (업데이트된 playedPlayers 전달)
        ctx.clearRect(0, 0, width, LADDER_BOTTOM + 100);
        drawLadder(ctx, width, spacing, ladderPaths, path, null, newPlayedPlayers);
        
        setIsAnimating(false);
        
        // 결과 모달 표시
        showModal('success', '🎉 결과', `${playerNames[playerIndex]}님은 "${selectedRestaurant.name}"에 가게 되었습니다!`);
        
        // 모든 플레이어가 다 탔는지 확인
        if (newPlayedPlayers.length === numPlayers) {
            setGameState('result');
        } else {
            setGameState('ready');
        }
    };

    // 게임 리셋
    const resetGame = () => {
        setGameState('setup');
        setSelectedPlayer(null);
        setLadderPaths([]);
        setAnimatingPath([]);
        setAnimatingCol(null);
        setResults([]);
        setSelectedRestaurants([]);
        setIsAnimating(false);
        setPlayedPlayers([]);
        setPlayerResults({});
        
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // 모든 결과 한번에 보기
    const showAllResults = () => {
        // 아직 안 탄 플레이어들의 결과도 계산
        const allResults = { ...playerResults };
        
        for (let i = 0; i < numPlayers; i++) {
            if (!allResults[i]) {
                const { endCol } = calculatePath(i);
                allResults[i] = results[endCol];
            }
        }
        
        setPlayerResults(allResults);
        setGameState('result');
    };

    // 캔버스 클릭 핸들러
    const handleCanvasClick = (event) => {
        if (gameState !== 'ready' || isAnimating) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const spacing = canvas.width / (numPlayers + 1);
        
        // 플레이어 이름 영역 클릭 확인 (상단)
        if (y >= LADDER_TOP - 40 && y <= LADDER_TOP - 10) {
            for (let i = 0; i < numPlayers; i++) {
                const playerX = spacing * (i + 1);
                if (Math.abs(x - playerX) < 40) {
                    startLadder(i);
                    break;
                }
            }
        }
    };

    // 캔버스 그리기
    useEffect(() => {
        if (gameState === 'ready' || gameState === 'playing' || gameState === 'result') {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const spacing = width / (numPlayers + 1);

            drawLadder(ctx, width, spacing, ladderPaths, animatingPath, animatingCol, playedPlayers);
        }
    }, [gameState, animatingPath, animatingCol, numPlayers, ladderPaths, playedPlayers]);

    return (
        <>
            <Head>
                <title>사다리 타기 - 맛집 선택</title>
            </Head>

            <div className="page-container">
                <header className="page-header">
                    <button onClick={() => router.push('/')} className="btn-back">
                        ← 홈으로
                    </button>
                    <h1>🪜 사다리 타기</h1>
                </header>

                <main className="main-content">
                    {gameState === 'setup' ? (
                        <section className="ladder-setup-section">
                            <div className="setup-content">
                                <h2>게임 설정</h2>
                                
                                <div className="setup-group">
                                    <label>플레이어 수</label>
                                    <div className="player-count-buttons">
                                        {[2, 3, 4, 5, 6].map(count => (
                                            <button
                                                key={count}
                                                onClick={() => handlePlayerCountChange(count)}
                                                className={`btn-count ${numPlayers === count ? 'active' : ''}`}
                                            >
                                                {count}명
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="setup-group">
                                    <label>플레이어 이름</label>
                                    <div className="player-names">
                                        {playerNames.map((name, index) => (
                                            <input
                                                key={index}
                                                type="text"
                                                value={name}
                                                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                                className="input-player-name"
                                                placeholder={`플레이어 ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setGameState('selectRestaurants')}
                                    className="btn-generate"
                                    disabled={restaurants.length < numPlayers}
                                >
                                    다음
                                </button>

                                {restaurants.length < numPlayers && (
                                    <p className="warning-text">
                                        최소 {numPlayers}개 이상의 가게가 필요합니다.
                                    </p>
                                )}
                            </div>
                        </section>
                    ) : gameState === 'selectRestaurants' ? (
                        <section className="restaurant-select-section">
                            <div className="select-content">
                                <div className="select-header">
                                    <h2>🍽️ 가게 선택</h2>
                                    <p className="select-instruction">
                                        사다리에 포함할 가게를 선택해주세요
                                    </p>
                                    <div className="selection-counter">
                                        <span className="counter-badge">{selectedRestaurants.length} / {numPlayers}</span>
                                    </div>
                                </div>
                                
                                <div className="restaurant-grid">
                                    {restaurants.map(restaurant => {
                                        const isSelected = selectedRestaurants.find(r => r._id === restaurant._id);
                                        return (
                                            <div
                                                key={restaurant._id}
                                                onClick={() => toggleRestaurantSelection(restaurant)}
                                                className={`restaurant-card-modern ${isSelected ? 'selected' : ''}`}
                                            >
                                                {isSelected && (
                                                    <div className="selection-overlay">
                                                        <div className="check-icon">✓</div>
                                                    </div>
                                                )}
                                                <div className="card-image">
                                                    {restaurant.image ? (
                                                        <img src={restaurant.image} alt={restaurant.name} />
                                                    ) : (
                                                        <div className="placeholder-image">
                                                            <span className="placeholder-icon">🍽️</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="card-content">
                                                    <h3>{restaurant.name}</h3>
                                                    <div className="card-meta">
                                                        <span className="category-badge">{restaurant.category}</span>
                                                        <span className="distance-info">🚶‍♂️ {restaurant.distance}</span>
                                                    </div>
                                                    {restaurant.averageRating > 0 && (
                                                        <div className="rating-info">
                                                            <span className="stars">⭐ {restaurant.averageRating.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="select-actions">
                                    <button onClick={() => setGameState('setup')} className="btn-back-setup">
                                        ← 이전
                                    </button>
                                    <button
                                        onClick={confirmRestaurantSelection}
                                        className="btn-confirm"
                                        disabled={selectedRestaurants.length !== numPlayers}
                                    >
                                        🎲 사다리 생성하기
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="ladder-game-section">
                            <div className="game-container">
                                <div className="canvas-wrapper">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={600}
                                        className="ladder-canvas"
                                        onClick={handleCanvasClick}
                                        style={{ cursor: gameState === 'ready' && !isAnimating ? 'pointer' : 'default' }}
                                    />
                                </div>

                                {gameState === 'ready' && (
                                    <div className="player-select">
                                        <h3>플레이어 이름을 클릭하세요</h3>
                                        <p className="player-select-hint">
                                            {playedPlayers.length} / {numPlayers} 명 완료
                                        </p>
                                        <div className="player-buttons">
                                            {playerNames.map((name, index) => {
                                                const hasPlayed = playedPlayers.includes(index);
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => startLadder(index)}
                                                        className={`btn-player ${hasPlayed ? 'played' : ''}`}
                                                        disabled={isAnimating || hasPlayed}
                                                    >
                                                        {hasPlayed ? '✓ ' : ''}{name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {playedPlayers.length > 0 && (
                                            <button onClick={showAllResults} className="btn-show-results">
                                                🎉 결과 보기
                                            </button>
                                        )}
                                    </div>
                                )}

                                {gameState === 'result' && (
                                    <div className="results-section">
                                        <h3>🎉 최종 결과</h3>
                                        <div className="results-list">
                                            {playerNames.map((name, index) => {
                                                const restaurant = playerResults[index];
                                                const hasPlayed = playedPlayers.includes(index);
                                                return (
                                                    <div key={index} className="result-item">
                                                        <div className="result-player">
                                                            {hasPlayed ? '✓ ' : ''}{name}
                                                        </div>
                                                        <div className="result-arrow">→</div>
                                                        <div className="result-restaurant">
                                                            {restaurant ? (
                                                                <>
                                                                    <span className="restaurant-name">{restaurant.name}</span>
                                                                    <span className="restaurant-cat">{restaurant.category}</span>
                                                                </>
                                                            ) : (
                                                                <span className="not-played">미참여</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="game-controls">
                                    <button onClick={resetGame} className="btn-reset">
                                        🔄 다시 설정
                                    </button>
                                    {gameState === 'result' && (
                                        <button onClick={generateLadder} className="btn-new-game">
                                            🎲 새 사다리
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </main>

                {/* 모달 */}
                {modal.isOpen && (
                    <div className="ladder-modal-overlay" onClick={closeModal}>
                        <div className="ladder-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="ladder-modal-header">
                                <h3>{modal.title}</h3>
                            </div>
                            <div className="ladder-modal-body">
                                <p>{modal.message}</p>
                            </div>
                            <div className="ladder-modal-actions">
                                <button onClick={closeModal} className="ladder-btn-modal-confirm">
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
