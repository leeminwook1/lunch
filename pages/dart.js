import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/dart.module.css';

export default function DartGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 다트 게임 상태
    const [gameState, setGameState] = useState('ready'); // ready, aiming, throwing, result
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [dartPosition, setDartPosition] = useState(null);
    const [dartAnimation, setDartAnimation] = useState(null); // 애니메이션용 위치
    const [score, setScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [roundsPlayed, setRoundsPlayed] = useState(0);
    const [bestScore, setBestScore] = useState(0);

    // 다트판 설정
    const DARTBOARD_RADIUS = 200;
    const CENTER_X = 250;
    const CENTER_Y = 250;
    const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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

    // 모달 함수
    const showModal = (type, title, message, onConfirm = null) => {
        setModal({ isOpen: true, type, title, message, onConfirm });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    };

    const confirmModal = () => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        closeModal();
    };

    // 데이터 로딩
    useEffect(() => {
        const initializeData = async () => {
            try {
                // 사용자 정보 복원
                const savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
                const savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');

                if (savedUserId && savedUserName) {
                    setCurrentUser({ _id: savedUserId, name: savedUserName });
                }

                // 가게 목록 로딩 (페이지 진입 시마다 랜덤 셔플)
                const result = await apiCall('/api/restaurants');
                if (result.success && result.data.length > 0) {
                    const shuffled = [...result.data].sort(() => Math.random() - 0.5);
                    // 다트판은 최대 12섹션만 사용 → 과도한 중복 방지 위해 12개로 제한
                    setRestaurants(shuffled.slice(0, Math.min(12, shuffled.length)));
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 다트판 그리기
    useEffect(() => {
        if (restaurants.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        drawDartboard(ctx);
    }, [restaurants, dartPosition, dartAnimation]);

    const drawDartboard = (ctx) => {
        // 캔버스 초기화
        ctx.clearRect(0, 0, 500, 500);

        // 배경
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 500, 500);

        // 가게 수에 따라 섹션 나누기
        const sectionCount = Math.min(restaurants.length, 12);
        const anglePerSection = (2 * Math.PI) / sectionCount;

        // 각 섹션 그리기
        for (let i = 0; i < sectionCount; i++) {
            const startAngle = i * anglePerSection - Math.PI / 2;
            const endAngle = (i + 1) * anglePerSection - Math.PI / 2;

            // 섹션 색상
            ctx.fillStyle = COLORS[i % COLORS.length];
            ctx.beginPath();
            ctx.moveTo(CENTER_X, CENTER_Y);
            ctx.arc(CENTER_X, CENTER_Y, DARTBOARD_RADIUS, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();

            // 테두리
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 가게 이름 (회전하여 배치)
            ctx.save();
            ctx.translate(CENTER_X, CENTER_Y);
            ctx.rotate(startAngle + anglePerSection / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Pretendard, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(restaurants[i % restaurants.length].name, DARTBOARD_RADIUS * 0.65, 5);
            ctx.restore();
        }

        // 중앙 원 (불스아이)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, 30, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 불스아이 텍스트
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BULL', CENTER_X, CENTER_Y);

        // 애니메이션 중인 다트 (날아가는 중)
        if (dartAnimation) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            
            // 다트 본체
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(dartAnimation.x, dartAnimation.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            // 다트 궤적 (꼬리)
            const gradient = ctx.createLinearGradient(
                dartAnimation.x, dartAnimation.y,
                dartAnimation.x - 30, dartAnimation.y - 30
            );
            gradient.addColorStop(0, '#dc2626');
            gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(dartAnimation.x, dartAnimation.y);
            ctx.lineTo(dartAnimation.x - 30, dartAnimation.y - 30);
            ctx.stroke();
            
            ctx.restore();
        }

        // 다트가 착지한 경우
        if (dartPosition) {
            // 다트 그리기
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(dartPosition.x, dartPosition.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 다트 꼬리
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(dartPosition.x, dartPosition.y);
            ctx.lineTo(dartPosition.x - 15, dartPosition.y - 15);
            ctx.stroke();
            
            // 임팩트 효과 (원형 파동)
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(dartPosition.x, dartPosition.y, 8 + (i * 5), 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    };

    // 랜덤 위치 생성 (다트판 범위 내)
    const getRandomDartPosition = () => {
        // 다트판 반경 내의 랜덤 위치 생성
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * DARTBOARD_RADIUS;
        
        const x = CENTER_X + radius * Math.cos(angle);
        const y = CENTER_Y + radius * Math.sin(angle);
        
        return { x, y };
    };

    // 다트 던지기 애니메이션
    const animateDart = (startX, startY, endX, endY, duration) => {
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // easeInQuad: 점점 빨라지는 효과
            const easeProgress = progress * progress;
            
            const currentX = startX + (endX - startX) * easeProgress;
            const currentY = startY + (endY - startY) * easeProgress;
            
            setDartAnimation({ x: currentX, y: currentY });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDartAnimation(null);
                setDartPosition({ x: endX, y: endY });
            }
        };
        
        requestAnimationFrame(animate);
    };

    // 다트 던지기 버튼 클릭
    const handleThrowDart = async () => {
        if (gameState !== 'ready' && gameState !== 'result') return;
        if (restaurants.length === 0) {
            showModal('error', '오류', '가게 목록을 불러오는 중입니다.');
            return;
        }

        // 랜덤 위치 생성
        const targetPosition = getRandomDartPosition();

        // 애니메이션 시작
        setGameState('throwing');
        setDartPosition(null);
        
        // 시작 위치 (화면 왼쪽 위)
        const startX = 50;
        const startY = 50;
        
        // 다트 날아가는 애니메이션 (800ms)
        animateDart(startX, startY, targetPosition.x, targetPosition.y, 800);

        // 착지 후 결과 처리 (800ms + 100ms 여유)
        setTimeout(() => {
            const x = targetPosition.x;
            const y = targetPosition.y;

            // 중심으로부터의 거리 계산
            const dx = x - CENTER_X;
            const dy = y - CENTER_Y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let hitRestaurant = null;
            let hitScore = 0;

            // 불스아이 체크 (중앙 30px 이내)
            if (distance <= 30) {
                hitScore = 100;
                hitRestaurant = restaurants[0];
            } else if (distance <= DARTBOARD_RADIUS) {
                // 각도 계산
                let angle = Math.atan2(dy, dx) + Math.PI / 2;
                if (angle < 0) angle += 2 * Math.PI;

                // 어느 섹션인지 계산
                const sectionCount = Math.min(restaurants.length, 12);
                const anglePerSection = (2 * Math.PI) / sectionCount;
                const sectionIndex = Math.floor(angle / anglePerSection);

                hitRestaurant = restaurants[sectionIndex % restaurants.length];

                // 거리에 따른 점수 (중심에 가까울수록 높은 점수)
                const distanceRatio = distance / DARTBOARD_RADIUS;
                hitScore = Math.round(50 + (1 - distanceRatio) * 50);
            } else {
                // 다트판 밖
                hitScore = 0;
                showModal('error', '아쉬워요!', '다트판을 벗어났습니다. 다시 시도해보세요!');
                setGameState('ready');
                return;
            }

            setScore(hitScore);
            setTotalScore(prev => prev + hitScore);
            setRoundsPlayed(prev => prev + 1);
            setSelectedRestaurant(hitRestaurant);
            setGameState('result');

            if (hitScore > bestScore) {
                setBestScore(hitScore);
            }

            // 선택 기록 저장
            if (currentUser && hitRestaurant) {
                saveSelection(hitRestaurant);
            }

            // 결과 모달 표시
            showModal(
                'success',
                hitScore === 100 ? '🎯 불스아이!' : '🎉 명중!',
                `${hitRestaurant.name}을(를) 맞췄습니다!\n점수: ${hitScore}점`
            );
        }, 900);
    };

    // 선택 기록 저장
    const saveSelection = async (restaurant) => {
        try {
            await apiCall('/api/selections', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    method: 'dart_game'
                })
            });
        } catch (error) {
            console.error('선택 기록 저장 실패:', error);
        }
    };

    // 다시 던지기
    const resetDart = () => {
        setDartPosition(null);
        setDartAnimation(null);
        setSelectedRestaurant(null);
        setScore(0);
        setGameState('ready');
    };

    // 게임 초기화
    const resetGame = () => {
        setDartPosition(null);
        setDartAnimation(null);
        setSelectedRestaurant(null);
        setScore(0);
        setTotalScore(0);
        setRoundsPlayed(0);
        setGameState('ready');
    };

    // 모달 컴포넌트
    const Modal = () => {
        if (!modal.isOpen) return null;

        return (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className={`modal-header ${modal.type}`}>
                        <h3>{modal.title}</h3>
                    </div>
                    <div className="modal-body">
                        <p style={{ whiteSpace: 'pre-line' }}>{modal.message}</p>
                    </div>
                    <div className="modal-footer">
                        {modal.type === 'confirm' ? (
                            <>
                                <button className="modal-btn cancel" onClick={closeModal}>취소</button>
                                <button className="modal-btn confirm" onClick={confirmModal}>확인</button>
                            </>
                        ) : (
                            <button className="modal-btn confirm" onClick={closeModal}>확인</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Head>
                <title>다트 게임 - 점심메뉴 선택기</title>
                <meta name="description" content="다트를 던져서 오늘의 점심메뉴를 선택해보세요!" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="app">
                <div className="container">
                    {/* 헤더 */}
                    <header className="header subpage-header">
                        <div className="header-content">
                            <div className="header-left">
                                <button
                                    onClick={() => router.push('/')}
                                    className="btn-back"
                                >
                                    ← 돌아가기
                                </button>
                                <h1 className="title">🎯 다트 게임</h1>
                                {currentUser && (
                                    <div className="user-info">
                                        <span className="user-greeting">안녕하세요, <strong>{currentUser.name}</strong>님!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* 메인 콘텐츠 */}
                    <main className="main-content">
                        {/* 다트 게임 섹션 */}
                        <section className={styles.dartGameSection}>
                            <div className={styles.dartGameContainer}>
                                <div className={styles.gameInstructions}>
                                    <h2>🎯 다트를 던져 오늘의 점심을 선택하세요!</h2>
                                    <p>버튼을 클릭하면 다트가 랜덤 위치로 날아갑니다! 운을 믿어보세요!</p>
                                </div>

                                {/* 점수판 */}
                                <div className={styles.scoreBoard}>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.scoreLabel}>현재 점수</span>
                                        <span className={styles.scoreValue}>{score}점</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.scoreLabel}>총 점수</span>
                                        <span className={styles.scoreValue}>{totalScore}점</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.scoreLabel}>플레이 횟수</span>
                                        <span className={styles.scoreValue}>{roundsPlayed}회</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.scoreLabel}>최고 점수</span>
                                        <span className={`${styles.scoreValue} ${styles.highlight}`}>{bestScore}점</span>
                                    </div>
                                </div>

                                {/* 다트판 캔버스 */}
                                <div className={styles.dartboardContainer}>
                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={500}
                                        className={`${styles.dartboardCanvas} ${gameState === 'throwing' ? styles.throwing : ''}`}
                                    />
                                    {gameState === 'throwing' && (
                                        <div className={styles.throwingIndicator}>
                                            🎯 다트가 날아가는 중...
                                        </div>
                                    )}
                                </div>

                                {/* 게임 컨트롤 */}
                                <div className={styles.gameControls}>
                                    <button
                                        onClick={handleThrowDart}
                                        disabled={gameState === 'throwing'}
                                        className={styles.btnThrowDart}
                                    >
                                        🎯 다트 던지기
                                    </button>
                                    <button
                                        onClick={resetDart}
                                        disabled={gameState !== 'result'}
                                        className={styles.btnResetDart}
                                    >
                                        🔄 다시 던지기
                                    </button>
                                    <button
                                        onClick={resetGame}
                                        disabled={roundsPlayed === 0}
                                        className={styles.btnResetGame}
                                    >
                                        🗑️ 게임 초기화
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 선택된 가게 정보 */}
                        {selectedRestaurant && (
                            <section className={styles.resultSection}>
                                <div className={styles.resultCard}>
                                    <h2>🎉 선택된 가게</h2>
                                    <div className={styles.selectedRestaurant}>
                                        <img
                                            src={selectedRestaurant.image}
                                            alt={selectedRestaurant.name}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                            }}
                                        />
                                        <div className={styles.restaurantInfo}>
                                            <h3>{selectedRestaurant.name}</h3>
                                            <p className={styles.category}>{selectedRestaurant.category}</p>
                                            <p className={styles.distance}>🚶‍♂️ {selectedRestaurant.distance}</p>
                                            {selectedRestaurant.description && (
                                                <p className={styles.description}>{selectedRestaurant.description}</p>
                                            )}
                                            <div className={styles.scoreBadge}>
                                                득점: {score}점
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 게임 설명 */}
                        <section className={styles.infoSection}>
                            <div className={styles.infoCard}>
                                <h3>🎯 다트 게임 규칙</h3>
                                <ul>
                                    <li>🎯 <strong>다트 던지기</strong>: 버튼을 클릭하면 랜덤 위치로 다트가 날아갑니다</li>
                                    <li>✨ <strong>애니메이션</strong>: 다트가 날아가는 모습을 실시간으로 볼 수 있습니다</li>
                                    <li>🎪 <strong>불스아이</strong>: 중앙을 맞추면 100점! (자동으로 첫 번째 가게 선택)</li>
                                    <li>🎨 <strong>색상 섹션</strong>: 각 색상 영역은 다른 가게를 나타냅니다</li>
                                    <li>📍 <strong>점수 계산</strong>: 중심에 가까울수록 높은 점수 (50~100점)</li>
                                    <li>🏆 <strong>목표</strong>: 높은 점수를 노려 원하는 가게를 선택하세요</li>
                                    <li>🔄 <strong>반복 플레이</strong>: 여러 번 던져서 최고 점수에 도전하세요!</li>
                                    <li>🎲 <strong>완전 랜덤</strong>: 매번 다른 위치로 던져지는 운빨 게임!</li>
                                </ul>
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            <Modal />
        </>
    );
}

