import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function CardGame() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [cards, setCards] = useState([]);
    const [flippedCard, setFlippedCard] = useState(null);

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
                // 사용자 정보 복원 (세션 스토리지 우선)
                const savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
                const savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');

                if (savedUserId && savedUserName) {
                    setCurrentUser({ _id: savedUserId, name: savedUserName });
                }

                // 가게 목록 로딩
                const result = await apiCall('/api/restaurants');
                if (result.success) {
                    setRestaurants(result.data);
                    initializeCards(result.data);
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 카드 초기화
    const initializeCards = (restaurantList) => {
        const shuffledRestaurants = [...restaurantList].sort(() => Math.random() - 0.5);
        const cardData = shuffledRestaurants.map((restaurant, index) => ({
            id: index,
            restaurant: restaurant,
            isFlipped: false
        }));
        setCards(cardData);
    };

    // 카드 뽑기
    const drawCard = async (cardId) => {
        if (!currentUser) {
            showModal('error', '오류', '사용자 정보가 없습니다.');
            return;
        }

        if (isDrawing) return;

        setIsDrawing(true);
        setSelectedRestaurant(null);

        // 선택된 카드 뒤집기
        const selectedCard = cards.find(card => card.id === cardId);
        if (!selectedCard) {
            setIsDrawing(false);
            return;
        }

        // 카드 뒤집기 애니메이션
        setFlippedCard(cardId);
        
        setTimeout(async () => {
            setSelectedRestaurant(selectedCard.restaurant);
            
            // 선택 기록 저장
            try {
                await apiCall('/api/selections', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: currentUser._id,
                        userName: currentUser.name,
                        restaurantId: selectedCard.restaurant._id,
                        restaurantName: selectedCard.restaurant.name,
                        method: 'card_draw'
                    })
                });
                
                // API 호출 성공 후에만 모달 표시
                showModal('success', '🎉 운명의 카드!', `${selectedCard.restaurant.name}이(가) 선택되었습니다! 오늘 점심은 여기로 가세요!`);
            } catch (error) {
                console.error('선택 기록 저장 실패:', error);
                // 에러가 발생해도 모달은 표시 (사용자 경험을 위해)
                showModal('success', '🎉 운명의 카드!', `${selectedCard.restaurant.name}이(가) 선택되었습니다! 오늘 점심은 여기로 가세요!`);
            }

            setIsDrawing(false);
        }, 1000);
    };

    // 카드 다시 섞기
    const shuffleCards = () => {
        if (isDrawing) return;
        
        setSelectedRestaurant(null);
        setFlippedCard(null);
        initializeCards(restaurants);
        showModal('info', '🔄 카드 섞기', '카드를 다시 섞었습니다! 새로운 운명의 카드를 선택해보세요!');
    };

    // 모달 컴포넌트
    const Modal = () => {
        if (!modal.isOpen) return null;

        return (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className={`modal-header ${modal.type === 'info' ? 'confirm' : modal.type}`}>
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
                <title>카드 뽑기 - 점심메뉴 선택기</title>
                <meta name="description" content="운명의 카드를 뽑아서 점심메뉴를 선택해보세요!" />
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
                                <h1 className="title">🃏 카드 뽑기</h1>
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
                        {/* 카드 게임 섹션 */}
                        <section className="card-game-section">
                            <div className="card-game-container">
                                <div className="game-instructions">
                                    <h2>🔮 운명의 카드를 선택하세요!</h2>
                                    <p>카드 중 하나를 클릭하여 오늘의 점심메뉴를 결정해보세요</p>
                                </div>

                                <div className="cards-grid">
                                    {cards.slice(0, 12).map((card) => (
                                        <div
                                            key={card.id}
                                            className={`card ${flippedCard === card.id ? 'flipped' : ''} ${isDrawing && flippedCard !== card.id ? 'disabled' : ''}`}
                                            onClick={() => drawCard(card.id)}
                                        >
                                            <div className="card-inner">
                                                <div className="card-back">
                                                    <div className="card-pattern">🃏</div>
                                                    <div className="card-text">?</div>
                                                </div>
                                                <div className="card-front">
                                                    <div className="restaurant-emoji">🍽️</div>
                                                    <div className="restaurant-name">{card.restaurant.name}</div>
                                                    <div className="restaurant-category">{card.restaurant.category}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="game-controls">
                                    <button
                                        onClick={shuffleCards}
                                        disabled={isDrawing || restaurants.length === 0}
                                        className="btn-shuffle"
                                    >
                                        🔄 카드 다시 섞기
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 결과 섹션 */}
                        {selectedRestaurant && (
                            <section className="result-section">
                                <div className="result-card">
                                    <h2>🎉 선택된 가게</h2>
                                    <div className="selected-restaurant">
                                        <img
                                            src={selectedRestaurant.image}
                                            alt={selectedRestaurant.name}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                            }}
                                        />
                                        <div className="restaurant-info">
                                            <h3>{selectedRestaurant.name}</h3>
                                            <p className="category">{selectedRestaurant.category}</p>
                                            <p className="distance">🚶‍♂️ {selectedRestaurant.distance}</p>
                                            {selectedRestaurant.description && (
                                                <p className="description">{selectedRestaurant.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 설명 섹션 */}
                        <section className="info-section">
                            <div className="info-card">
                                <h3>🃏 카드 뽑기 게임 방법</h3>
                                <ul>
                                    <li>🎯 <strong>카드 선택</strong>: 12장의 카드 중 하나를 클릭하여 선택하세요</li>
                                    <li>🔮 <strong>운명의 카드</strong>: 선택한 카드가 뒤집히면서 가게가 공개됩니다</li>
                                    <li>✨ <strong>애니메이션</strong>: 카드가 뒤집히는 멋진 애니메이션을 즐기세요</li>
                                    <li>🔄 <strong>다시 섞기</strong>: 마음에 들지 않으면 카드를 다시 섞을 수 있습니다</li>
                                    <li>📊 <strong>기록</strong>: 선택된 가게는 자동으로 기록됩니다</li>
                                    <li>🍀 <strong>직감</strong>: 직감을 믿고 운명의 카드를 선택해보세요!</li>
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