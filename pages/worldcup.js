import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function WorldCup() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 월드컵 관련 상태
    const [gameStarted, setGameStarted] = useState(false);
    const [currentRound, setCurrentRound] = useState([]);
    const [nextRound, setNextRound] = useState([]);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [roundName, setRoundName] = useState('');
    const [winner, setWinner] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);

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
                const savedUserId = localStorage.getItem('currentUserId');
                const savedUserName = localStorage.getItem('currentUserName');
                
                if (savedUserId && savedUserName) {
                    setCurrentUser({ _id: savedUserId, name: savedUserName });
                }

                // 가게 목록 로딩
                const result = await apiCall('/api/restaurants');
                if (result.success) {
                    setRestaurants(result.data);
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 게임 시작
    const startGame = () => {
        if (restaurants.length < 2) {
            showModal('error', '오류', '최소 2개 이상의 가게가 필요합니다.');
            return;
        }

        const shuffled = [...restaurants].sort(() => Math.random() - 0.5);
        let gameSize = 16;
        
        if (shuffled.length >= 32) gameSize = 32;
        else if (shuffled.length >= 16) gameSize = 16;
        else if (shuffled.length >= 8) gameSize = 8;
        else if (shuffled.length >= 4) gameSize = 4;
        else gameSize = 2;

        const gameRestaurants = shuffled.slice(0, gameSize);
        
        setCurrentRound(gameRestaurants);
        setNextRound([]);
        setCurrentMatch(0);
        setRoundName(getRoundName(gameSize));
        setGameStarted(true);
        setWinner(null);
        setGameHistory([]);
    };

    // 라운드 이름 가져오기
    const getRoundName = (size) => {
        switch (size) {
            case 32: return '32강';
            case 16: return '16강';
            case 8: return '8강';
            case 4: return '준결승';
            case 2: return '결승';
            default: return '결승';
        }
    };

    // 가게 선택
    const selectRestaurant = async (restaurant) => {
        const newHistory = [...gameHistory, {
            round: roundName,
            match: currentMatch + 1,
            winner: restaurant,
            loser: currentRound[currentMatch * 2] === restaurant ? 
                   currentRound[currentMatch * 2 + 1] : 
                   currentRound[currentMatch * 2]
        }];
        setGameHistory(newHistory);

        const newNextRound = [...nextRound, restaurant];
        setNextRound(newNextRound);

        if (currentMatch + 1 >= currentRound.length / 2) {
            // 라운드 완료
            if (newNextRound.length === 1) {
                // 게임 완료
                setWinner(newNextRound[0]);
                showModal('success', '🏆 우승!', `${newNextRound[0].name}이(가) 우승했습니다!`);
                
                // 우승 기록 저장
                if (currentUser) {
                    try {
                        await apiCall('/api/selections', {
                            method: 'POST',
                            body: JSON.stringify({
                                userId: currentUser._id,
                                userName: currentUser.name,
                                restaurantId: newNextRound[0]._id,
                                restaurantName: newNextRound[0].name,
                                method: 'worldcup'
                            })
                        });
                    } catch (error) {
                        console.error('우승 기록 저장 실패:', error);
                    }
                }
            } else {
                // 다음 라운드로
                setCurrentRound(newNextRound);
                setNextRound([]);
                setCurrentMatch(0);
                setRoundName(getRoundName(newNextRound.length));
            }
        } else {
            // 다음 매치로
            setCurrentMatch(currentMatch + 1);
        }
    };

    // 게임 리셋
    const resetGame = () => {
        setGameStarted(false);
        setCurrentRound([]);
        setNextRound([]);
        setCurrentMatch(0);
        setRoundName('');
        setWinner(null);
        setGameHistory([]);
    };

    // 현재 매치 가져오기
    const getCurrentMatch = () => {
        if (!gameStarted || currentMatch * 2 + 1 >= currentRound.length) {
            return null;
        }
        return {
            restaurant1: currentRound[currentMatch * 2],
            restaurant2: currentRound[currentMatch * 2 + 1]
        };
    };

    const currentMatchData = getCurrentMatch();

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
                        <p>{modal.message}</p>
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
                <title>월드컵 - 점심메뉴 선택기</title>
                <meta name="description" content="가게 월드컵으로 최고의 점심메뉴를 선택해보세요!" />
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
                                <h1 className="title">🏆 가게 월드컵</h1>
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
                        {!gameStarted ? (
                            /* 게임 시작 화면 */
                            <section className="worldcup-start-section">
                                <div className="start-content">
                                    <div className="start-header">
                                        <h2>🏆 가게 월드컵</h2>
                                        <p>두 가게 중 더 좋아하는 곳을 선택하여 최고의 가게를 찾아보세요!</p>
                                    </div>
                                    
                                    <div className="game-info">
                                        <div className="info-item">
                                            <span className="info-icon">🏪</span>
                                            <span className="info-text">총 {restaurants.length}개 가게</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-icon">🎯</span>
                                            <span className="info-text">토너먼트 방식</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-icon">⏱️</span>
                                            <span className="info-text">약 3-5분 소요</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={startGame}
                                        disabled={restaurants.length < 2}
                                        className="btn-start-game"
                                    >
                                        🚀 게임 시작
                                    </button>

                                    {restaurants.length < 2 && (
                                        <p className="warning-text">
                                            게임을 시작하려면 최소 2개 이상의 가게가 필요합니다.
                                        </p>
                                    )}
                                </div>
                            </section>
                        ) : winner ? (
                            /* 게임 완료 화면 */
                            <section className="worldcup-result-section">
                                <div className="result-content">
                                    <h2>🏆 우승!</h2>
                                    <div className="winner-card">
                                        <img 
                                            src={winner.image} 
                                            alt={winner.name}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                            }}
                                        />
                                        <div className="winner-info">
                                            <h3>{winner.name}</h3>
                                            <p className="category">{winner.category}</p>
                                            <p className="distance">🚶‍♂️ {winner.distance}</p>
                                            {winner.description && (
                                                <p className="description">{winner.description}</p>
                                            )}
                                            {winner.websiteUrl && (
                                                <a 
                                                    href={winner.websiteUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="winner-website-link"
                                                >
                                                    🌐 웹사이트 방문하기
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="result-actions">
                                        <button onClick={resetGame} className="btn-play-again">
                                            🔄 다시 플레이
                                        </button>
                                        <button 
                                            onClick={() => router.push('/')}
                                            className="btn-go-home"
                                        >
                                            🏠 홈으로
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : currentMatchData ? (
                            /* 게임 진행 화면 */
                            <section className="worldcup-game-section">
                                <div className="game-header">
                                    <h2>{roundName}</h2>
                                    <p>{currentMatch + 1} / {Math.ceil(currentRound.length / 2)} 매치</p>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${((currentMatch + 1) / Math.ceil(currentRound.length / 2)) * 100}%` 
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="match-container">
                                    <div className="vs-text">VS</div>
                                    
                                    <div className="restaurant-options">
                                        <div 
                                            className="restaurant-option"
                                            onClick={() => selectRestaurant(currentMatchData.restaurant1)}
                                        >
                                            <img 
                                                src={currentMatchData.restaurant1.image} 
                                                alt={currentMatchData.restaurant1.name}
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                                }}
                                            />
                                            <div className="restaurant-info">
                                                <h3>{currentMatchData.restaurant1.name}</h3>
                                                <p className="category">{currentMatchData.restaurant1.category}</p>
                                                <p className="distance">🚶‍♂️ {currentMatchData.restaurant1.distance}</p>
                                                {currentMatchData.restaurant1.websiteUrl && (
                                                    <a 
                                                        href={currentMatchData.restaurant1.websiteUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="website-link"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        🌐 웹사이트 방문
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div 
                                            className="restaurant-option"
                                            onClick={() => selectRestaurant(currentMatchData.restaurant2)}
                                        >
                                            <img 
                                                src={currentMatchData.restaurant2.image} 
                                                alt={currentMatchData.restaurant2.name}
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                                }}
                                            />
                                            <div className="restaurant-info">
                                                <h3>{currentMatchData.restaurant2.name}</h3>
                                                <p className="category">{currentMatchData.restaurant2.category}</p>
                                                <p className="distance">🚶‍♂️ {currentMatchData.restaurant2.distance}</p>
                                                {currentMatchData.restaurant2.websiteUrl && (
                                                    <a 
                                                        href={currentMatchData.restaurant2.websiteUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="website-link"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        🌐 웹사이트 방문
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="game-controls">
                                    <button onClick={resetGame} className="btn-reset">
                                        🔄 게임 리셋
                                    </button>
                                </div>
                            </section>
                        ) : null}

                        {/* 게임 히스토리 */}
                        {gameHistory.length > 0 && (
                            <section className="history-section">
                                <h3>📊 게임 기록</h3>
                                <div className="history-list">
                                    {gameHistory.slice(-5).map((record, index) => (
                                        <div key={index} className="history-item">
                                            <span className="round">{record.round}</span>
                                            <span className="match">매치 {record.match}</span>
                                            <span className="winner">🏆 {record.winner.name}</span>
                                            <span className="vs">vs</span>
                                            <span className="loser">{record.loser.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>

            <Modal />
        </>
    );
}