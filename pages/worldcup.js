import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function WorldCup() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const modalTimeoutRef = useRef(null);

    // 월드컵 관련 상태
    const [gameStarted, setGameStarted] = useState(false);
    const [currentRound, setCurrentRound] = useState([]);
    const [nextRound, setNextRound] = useState([]);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [roundName, setRoundName] = useState('');
    const [winner, setWinner] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);

    // 모달 관련 함수들
    const showModal = (type, title, message, onConfirm = null) => {
        if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
        }
        if (modal.isOpen) {
            setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
            modalTimeoutRef.current = setTimeout(() => {
                setModal({ isOpen: true, type, title, message, onConfirm });
            }, 100);
        } else {
            setModal({ isOpen: true, type, title, message, onConfirm });
        }
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
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            showModal('error', '오류', `API 호출 중 오류가 발생했습니다: ${error.message}`);
            throw error;
        }
    };

    // 초기 로딩
    useEffect(() => {
        const initializeData = async () => {
            const savedUserId = localStorage.getItem('currentUserId');
            const savedUserName = localStorage.getItem('currentUserName');

            if (savedUserId && savedUserName) {
                setCurrentUser({ _id: savedUserId, name: savedUserName });
            }
            await loadRestaurants();
        };

        initializeData();

        return () => {
            if (modalTimeoutRef.current) {
                clearTimeout(modalTimeoutRef.current);
            }
        };
    }, []);

    const loadRestaurants = async () => {
        try {
            setLoading(true);
            const result = await apiCall('/api/restaurants');
            if (result.success) {
                setRestaurants(result.data.filter(restaurant => restaurant.isActive));
            }
        } catch (error) {
            console.error('가게 목록 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 배열 섞기 함수
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // 월드컵 시작
    const startWorldCup = () => {
        if (restaurants.length < 2) {
            showModal('error', '가게 부족', '월드컵을 진행하려면 최소 2개의 가게가 필요합니다.');
            return;
        }

        // 전체 가게를 사용하여 토너먼트 진행
        const totalRestaurants = restaurants.length;
        
        // 모든 가게를 섞음
        const shuffledRestaurants = shuffleArray([...restaurants]);
        
        // 32개를 초과하면 랜덤하게 32개만 선택
        let tournamentRestaurants = shuffledRestaurants.length > 32 
            ? shuffledRestaurants.slice(0, 32)
            : shuffledRestaurants;

        // 홀수개 가게 처리: 마지막 가게를 다음 라운드로 자동 진출
        let autoAdvanced = [];
        if (tournamentRestaurants.length % 2 === 1) {
            autoAdvanced = [tournamentRestaurants.pop()]; // 마지막 가게를 제거하고 자동 진출
        }

        setCurrentRound(tournamentRestaurants);
        setNextRound(autoAdvanced);
        setCurrentMatch(0);
        setRoundName(getRoundName(tournamentRestaurants.length + autoAdvanced.length));
        setGameStarted(true);
        setWinner(null);
        
        // 자동 진출 히스토리 추가
        const initialHistory = autoAdvanced.length > 0 ? [{
            round: getRoundName(tournamentRestaurants.length + autoAdvanced.length),
            match: 'auto',
            winner: autoAdvanced[0],
            loser: null,
            isAutoAdvanced: true
        }] : [];
        
        setGameHistory(initialHistory);
    };

    // 라운드 이름 가져오기
    const getRoundName = (size) => {
        if (size <= 1) return '우승';
        if (size === 2) return '결승';
        if (size === 3 || size === 4) return '준결승';
        if (size <= 8) return '8강';
        if (size <= 16) return '16강';
        if (size <= 32) return '32강';
        return `${size}강`;
    };

    // 가게 선택
    const selectRestaurant = (selectedRestaurant) => {
        if (!selectedRestaurant) {
            console.error('Selected restaurant is null');
            return;
        }

        const opponent1 = currentRound[currentMatch * 2];
        const opponent2 = currentRound[currentMatch * 2 + 1];
        const loser = opponent1 === selectedRestaurant ? opponent2 : opponent1;

        // 게임 히스토리에 추가
        setGameHistory(prev => [...prev, {
            round: roundName,
            match: currentMatch + 1,
            winner: selectedRestaurant,
            loser: loser
        }]);

        // 다음 라운드에 승자 추가
        setNextRound(prev => [...prev, selectedRestaurant]);

        const nextMatchIndex = currentMatch + 1;
        const totalMatches = Math.floor(currentRound.length / 2);

        if (nextMatchIndex >= totalMatches) {
            // 현재 라운드 종료
            const newRound = [...nextRound, selectedRestaurant];
            
            if (newRound.length === 1) {
                // 최종 우승자
                setWinner(selectedRestaurant);
                setGameStarted(false);
            } else {
                // 다음 라운드로 진행
                setCurrentRound(newRound);
                setNextRound([]);
                setCurrentMatch(0);
                setRoundName(getRoundName(newRound.length));
            }
        } else {
            // 같은 라운드 다음 매치
            setCurrentMatch(nextMatchIndex);
        }
    };

    // 게임 재시작
    const restartGame = () => {
        setGameStarted(false);
        setCurrentRound([]);
        setNextRound([]);
        setCurrentMatch(0);
        setRoundName('');
        setWinner(null);
        setGameHistory([]);
    };

    // 현재 대결 가게들
    const getCurrentMatch = () => {
        if (!gameStarted || currentMatch * 2 + 1 >= currentRound.length) {
            return [null, null];
        }
        return [
            currentRound[currentMatch * 2],
            currentRound[currentMatch * 2 + 1]
        ];
    };


    const [restaurant1, restaurant2] = getCurrentMatch();
    const progress = gameStarted ? 
        ((currentMatch + (currentRound.length > nextRound.length * 2 ? 0 : 1)) / Math.floor(currentRound.length / 2)) * 100 : 0;

    // 모달 컴포넌트
    const Modal = () => {
        if (!modal.isOpen) return null;

        return (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>{modal.title}</h3>
                    <p>{modal.message}</p>
                    <div className="modal-buttons">
                        {modal.type === 'confirm' ? (
                            <>
                                <button onClick={confirmModal} className="confirm-btn">확인</button>
                                <button onClick={closeModal} className="cancel-btn">취소</button>
                            </>
                        ) : (
                            <button onClick={closeModal} className="confirm-btn">확인</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!currentUser) {
        return (
            <div className="App">
                <div className="container">
                    <h1>🏆 점식 식당 월드컵</h1>
                    <p>이상형 월드컵을 플레이하려면 먼저 메인 페이지에서 로그인해주세요.</p>
                    <a href="/" className="home-btn">
                        <span className="home-icon">🏠</span>
                        메인으로
                    </a>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>점식 식당 월드컵 - 점심메뉴 선택기</title>
                <meta name="description" content="점식 식당 월드컵으로 선택 장애 해결!" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="App">
                <div className="container">
                    <div className="header">
                        <h1 className="title">🏆 점식 식당 월드컵</h1>
                        <a href="/" className="home-btn">
                            <span className="home-icon">🏠</span>
                            메인으로
                        </a>
                    </div>

                    {!gameStarted && !winner ? (
                        // 게임 시작 화면
                        <div className="worldcup-start">
                            <div className="start-info">
                                <h2>🥊 토너먼트 대전 준비!</h2>
                                <p>등록된 가게들 중에서 토너먼트 방식으로 최고의 가게를 선택해보세요!</p>
                                <div className="game-stats">
                                    <div className="stat-item">
                                        <span className="stat-number">{Math.min(restaurants.length, 32)}</span>
                                        <span className="stat-label">참가 가게</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-number">{getRoundName(Math.min(restaurants.length, 32))}</span>
                                        <span className="stat-label">시작 라운드</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                className="start-worldcup-btn" 
                                onClick={startWorldCup}
                                disabled={loading || restaurants.length < 2}
                            >
                                {loading ? '로딩 중...' : '🚀 월드컵 시작!'}
                            </button>
                        </div>
                    ) : winner ? (
                        // 게임 결과 화면
                        <div className="worldcup-result">
                            <div className="winner-announcement">
                                <h2>🏆 우승 가게</h2>
                                <div className="winner-card">
                                    <div className="winner-image">
                                        {winner.image ? (
                                            <img src={winner.image} alt={winner.name} />
                                        ) : (
                                            <div className="no-image">🍽️</div>
                                        )}
                                    </div>
                                    <div className="winner-info">
                                        <h3>{winner.name}</h3>
                                        <p className="winner-category">{winner.category}</p>
                                        <p className="winner-rating">⭐ {winner.averageRating?.toFixed(1) || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="result-actions">
                                    <button className="restart-btn" onClick={restartGame}>
                                        🔄 다시 플레이
                                    </button>
                                    <button 
                                        className="goto-restaurant-btn" 
                                        onClick={() => router.push(`/?restaurantId=${winner._id}`)}
                                    >
                                        🍽️ 가게 상세보기
                                    </button>
                                </div>
                            </div>
                            
                            {gameHistory.length > 0 && (
                                <div className="game-history">
                                    <h3>🏆 경기 결과</h3>
                                    <div className="history-list">
                                        {gameHistory.map((match, index) => (
                                            <div key={index} className={`history-item ${match.isAutoAdvanced ? 'auto-advanced' : ''}`}>
                                                <span className="round-name">{match.round}</span>
                                                <span className="match-result">
                                                    {match.isAutoAdvanced ? (
                                                        <>
                                                            <strong>{match.winner?.name || '알 수 없음'}</strong> <span className="auto-indicator">🎟️ 자동진출</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <strong>{match.winner?.name || '알 수 없음'}</strong> vs {match.loser?.name || '알 수 없음'}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // 게임 진행 화면
                        <div className="worldcup-game">
                            <div className="game-header">
                                <div className="round-info">
                                    <h2>{roundName}</h2>
                                    <p>{currentMatch + 1} / {Math.floor(currentRound.length / 2)} 경기</p>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="vs-container">
                                <div className="restaurant-option">
                                    <div className="restaurant-image">
                                        {restaurant1?.image ? (
                                            <img src={restaurant1.image} alt={restaurant1.name} />
                                        ) : (
                                            <div className="no-image">🍽️</div>
                                        )}
                                    </div>
                                    <div className="restaurant-details">
                                        <h3>{restaurant1?.name}</h3>
                                        <p className="category">{restaurant1?.category}</p>
                                        <p className="rating">⭐ {restaurant1?.averageRating?.toFixed(1) || 'N/A'}</p>
                                    </div>
                                    <div className="restaurant-actions">
                                        <button 
                                            className="select-restaurant-btn"
                                            onClick={() => selectRestaurant(restaurant1)}
                                        >
                                            🏆 선택
                                        </button>
                                        {restaurant1?.websiteUrl && (
                                            <a 
                                                href={restaurant1.websiteUrl}
                                                className="website-link-btn"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                🔗 웹사이트
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="vs-divider">
                                    <span>VS</span>
                                </div>

                                <div className="restaurant-option">
                                    <div className="restaurant-image">
                                        {restaurant2?.image ? (
                                            <img src={restaurant2.image} alt={restaurant2.name} />
                                        ) : (
                                            <div className="no-image">🍽️</div>
                                        )}
                                    </div>
                                    <div className="restaurant-details">
                                        <h3>{restaurant2?.name}</h3>
                                        <p className="category">{restaurant2?.category}</p>
                                        <p className="rating">⭐ {restaurant2?.averageRating?.toFixed(1) || 'N/A'}</p>
                                    </div>
                                    <div className="restaurant-actions">
                                        <button 
                                            className="select-restaurant-btn"
                                            onClick={() => selectRestaurant(restaurant2)}
                                        >
                                            🏆 선택
                                        </button>
                                        {restaurant2?.websiteUrl && (
                                            <a 
                                                href={restaurant2.websiteUrl}
                                                className="website-link-btn"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                🔗 웹사이트
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="game-actions">
                                <button className="quit-btn" onClick={restartGame}>
                                    ❌ 게임 종료
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Modal />
        </>
    );
}
