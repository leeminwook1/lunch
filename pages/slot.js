import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function SlotMachine() {
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    
    // 슬롯 릴 상태
    const [reels, setReels] = useState([
        { items: [], currentIndex: 0, isSpinning: false },
        { items: [], currentIndex: 0, isSpinning: false },
        { items: [], currentIndex: 0, isSpinning: false }
    ]);
    
    const reelRefs = [useRef(null), useRef(null), useRef(null)];

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
            // 저장된 사용자 정보 확인
            const savedUserId = localStorage.getItem('currentUserId');
            const savedUserName = localStorage.getItem('currentUserName');
            
            if (savedUserId && savedUserName) {
                setCurrentUser({ _id: savedUserId, name: savedUserName });
            }
            
            await loadRestaurants();
        };

        initializeData();
    }, []);

    const loadRestaurants = async () => {
        try {
            const result = await apiCall('/api/restaurants');
            if (result.success && result.data.length > 0) {
                setRestaurants(result.data);
                initializeReels(result.data);
            }
        } catch (error) {
            console.error('가게 목록 로딩 실패:', error);
        }
    };

    // 릴 초기화 - 실제 가게만 사용
    const initializeReels = (restaurantData) => {
        // 가게 수가 적으면 반복해서 충분한 릴 아이템 생성
        const minItems = 15;
        const createRestaurantReel = (count = minItems) => {
            const result = [];
            for (let i = 0; i < count; i++) {
                const restaurant = restaurantData[i % restaurantData.length];
                result.push(restaurant); // 전체 가게 객체를 저장
            }
            return result;
        };

        // 3개 릴 모두 동일한 가게 리스트 사용 (순서만 다르게)
        const baseRestaurants = createRestaurantReel();
        
        const newReels = [
            { 
                items: [...baseRestaurants], // 첫 번째 릴
                currentIndex: 0, 
                isSpinning: false 
            },
            { 
                items: [...baseRestaurants].reverse(), // 두 번째 릴 (역순)
                currentIndex: 0, 
                isSpinning: false 
            },
            { 
                items: [...baseRestaurants].sort(() => Math.random() - 0.5), // 세 번째 릴 (랜덤 순서)
                currentIndex: 0, 
                isSpinning: false 
            }
        ];

        setReels(newReels);

        // 초기 위치 설정
        setTimeout(() => {
            reelRefs.forEach((ref, index) => {
                if (ref.current) {
                    ref.current.style.transform = 'translateY(0px)';
                    ref.current.style.transition = 'none';
                }
            });
        }, 100);
    };

    // 슬롯머신 스핀
    const spinSlots = async () => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        if (restaurants.length === 0) {
            showModal('error', '오류', '등록된 가게가 없습니다.');
            return;
        }

        setIsSpinning(true);
        setSelectedRestaurant(null);

        // 각 릴을 순차적으로 스핀
        const spinDurations = [2000, 2500, 3000]; // 각 릴의 스핀 시간
        const finalIndices = [];

        // 모든 릴을 동시에 스핀 시작
        setReels(prev => prev.map(reel => ({ ...reel, isSpinning: true })));

        for (let i = 0; i < 3; i++) {
            // 가운데 칸에 맞는 인덱스 계산 (윈도우에서 3개가 보이므로 1번째가 가운데)
            const randomOffset = Math.floor(Math.random() * (reels[i].items.length - 2)); // 마지막 2개 제외
            const finalIndex = randomOffset + 1; // 가운데 칸이 되도록 +1
            finalIndices.push(finalIndex);

            // 스핀 애니메이션 시작
            const reel = reelRefs[i].current;
            if (reel) {
                const itemHeight = 80;
                
                // 빠른 스핀 애니메이션 시작
                let currentPosition = 0;
                const spinSpeed = 20; // 스핀 속도 (ms)
                const totalItems = reels[i].items.length;
                
                const spinInterval = setInterval(() => {
                    currentPosition -= itemHeight;
                    if (currentPosition <= -(totalItems * itemHeight)) {
                        currentPosition = 0; // 처음으로 돌아가기
                    }
                    reel.style.transform = `translateY(${currentPosition}px)`;
                }, spinSpeed);

                // 지정된 시간 후 릴 정지
                setTimeout(() => {
                    clearInterval(spinInterval);
                    
                    // 최종 위치로 부드럽게 이동 (가운데 칸에 맞춰서)
                    const finalPosition = -((finalIndex - 1) * itemHeight); // -1을 해서 가운데 칸에 맞춤
                    reel.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    reel.style.transform = `translateY(${finalPosition}px)`;
                    
                    // 릴 정지 상태 업데이트
                    setReels(prev => prev.map((reelState, index) => 
                        index === i ? { ...reelState, isSpinning: false, currentIndex: finalIndex } : reelState
                    ));
                    
                    // 트랜지션 제거
                    setTimeout(() => {
                        reel.style.transition = 'none';
                    }, 500);
                    
                }, spinDurations[i]);
            }
        }

        // 모든 릴이 정지한 후 결과 처리
        setTimeout(async () => {
            // 가운데 릴(두 번째 릴)의 가게가 당첨
            const middleReelIndex = finalIndices[1];
            const selectedRestaurant = reels[1].items[middleReelIndex];



            // 1초 후 가운데 릴 하이라이트
            setTimeout(() => {
                // 가운데 릴만 하이라이트
                reelRefs.forEach((ref, index) => {
                    if (ref.current) {
                        const reelWindow = ref.current.parentElement;
                        if (index === 1) { // 가운데 릴 (인덱스 1)
                            reelWindow.classList.add('winning-reel');
                        } else {
                            reelWindow.classList.add('losing-reel');
                        }
                    }
                });
                
                // 2초 후 결과 표시
                setTimeout(() => {
                    setSelectedRestaurant(selectedRestaurant);
                    setIsSpinning(false);

                    // 하이라이트 제거
                    reelRefs.forEach((ref) => {
                        if (ref.current) {
                            const reelWindow = ref.current.parentElement;
                            reelWindow.classList.remove('winning-reel', 'losing-reel');
                        }
                    });

                    // 방문 기록 저장
                    apiCall('/api/restaurants/random', {
                        method: 'POST',
                        body: JSON.stringify({
                            userId: currentUser._id,
                            userName: currentUser.name,
                            restaurantId: selectedRestaurant._id
                        })
                    }).catch(error => {
                        // 방문 기록 저장 실패 시 무시
                    });
                }, 2000);
                
            }, 1000);

        }, Math.max(...spinDurations) + 500);
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

    if (!currentUser) {
        return (
            <div className="App">
                <div className="container">
                    <h1>🎰 슬롯머신</h1>
                    <p>슬롯머신을 이용하려면 먼저 메인 페이지에서 로그인해주세요.</p>
                    <a href="/" className="home-btn">
                        <span className="home-icon">🏠</span>
                        메인 페이지로 이동
                    </a>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>🎰 슬롯머신 - 점심메뉴 선택기</title>
                <meta name="description" content="슬롯머신으로 재미있게 가게를 선택하세요!" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="App">
                <div className="container">
                    <div className="header">
                        <h1 className="title">🎰 슬롯머신</h1>
                        <a href="/" className="home-btn">
                            <span className="home-icon">🏠</span>
                            메인으로
                        </a>
                    </div>

                    {/* 슬롯머신 */}
                    <div className="slot-machine">
                        <div className="slot-machine-frame">
                            <div className="slot-reels">
                                {reels.map((reel, reelIndex) => (
                                    <div key={reelIndex} className="slot-reel-container">
                                        <div className="slot-reel-window">
                                            <div 
                                                ref={reelRefs[reelIndex]}
                                                className={`slot-reel ${reel.isSpinning ? 'spinning' : ''}`}
                                            >
                                                {reel.items.map((restaurant, itemIndex) => (
                                                    <div key={itemIndex} className="slot-item">
                                                        <div className="slot-restaurant-info">
                                                            <div className="slot-restaurant-name">{restaurant.name}</div>
                                                            <div className="slot-restaurant-details">
                                                                <span className="slot-category">{restaurant.category}</span>
                                                                <span className="slot-distance">{restaurant.distance}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="slot-label">
                                            {reelIndex === 0 ? '🎰 릴 1' : 
                                             reelIndex === 1 ? '🎰 릴 2' : '🎰 릴 3'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 스핀 버튼 */}
                        <button
                            className={`slot-spin-btn ${isSpinning ? 'spinning' : ''}`}
                            onClick={spinSlots}
                            disabled={isSpinning || restaurants.length === 0}
                        >
                            {isSpinning ? '🎰 스핀 중...' : '🎰 SPIN!'}
                        </button>
                    </div>

                    {/* 결과 표시 */}
                    {selectedRestaurant && !isSpinning && (
                        <div className="slot-result">
                            <h2>🎉 당첨!</h2>
                            <div className="selected-restaurant-card">
                                <img 
                                    src={selectedRestaurant.image} 
                                    alt={selectedRestaurant.name}
                                    className="result-image"
                                />
                                <div className="result-info">
                                    <h3>{selectedRestaurant.name}</h3>
                                    <p className="result-category">{selectedRestaurant.category}</p>
                                    <p className="result-distance">{selectedRestaurant.distance}</p>
                                    {selectedRestaurant.description && (
                                        <p className="result-description">{selectedRestaurant.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="result-actions">
                                <button 
                                    className="modern-btn primary"
                                    onClick={spinSlots}
                                    disabled={isSpinning}
                                >
                                    🎰 다시 스핀
                                </button>
                                <a 
                                    href={`/?restaurantId=${selectedRestaurant._id}`}
                                    className="modern-btn secondary"
                                >
                                    📍 가게 상세보기
                                </a>
                            </div>
                        </div>
                    )}

                    {/* 게임 설명 */}
                    <div className="slot-info">
                        <h3>🎰 가게 슬롯머신 게임 방법</h3>
                        <ul>
                            <li>🎯 <strong>SPIN!</strong> 버튼을 눌러 슬롯머신을 시작하세요</li>
                            <li>🎪 3개의 릴에 실제 등록된 가게들이 빠르게 돌아갑니다</li>
                            <li>⏰ 릴이 순차적으로 멈춥니다 (2초 → 2.5초 → 3초)</li>
                            <li>🎯 각 릴의 <span style={{color: '#f39c12', fontWeight: 'bold'}}>황금 테두리 가운데 칸</span>을 주목하세요!</li>
                            <li>🏆 가운데 릴의 가운데 칸에 있는 가게가 당첨됩니다</li>
                            <li>🎊 당첨된 가게가 오늘의 점심 메뉴로 선택됩니다!</li>
                        </ul>
                    </div>
                </div>
            </div>
            <Modal />
        </>
    );
}