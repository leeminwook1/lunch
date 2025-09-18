import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState('');
    const [newReview, setNewReview] = useState({ rating: 5, content: '' });
    const [sortBy, setSortBy] = useState('newest');
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [isAdmin, setIsAdmin] = useState(false);
    const modalTimeoutRef = useRef(null);

    // 모달 관련 함수들
    const showModal = (type, title, message, onConfirm = null) => {
        // 기존 타이머가 있으면 취소
        if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
        }
        
        // 기존 모달이 열려있으면 먼저 닫기
        if (modal.isOpen) {
            setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
            
            // 잠시 대기 후 새 모달 열기
            modalTimeoutRef.current = setTimeout(() => {
                setModal({ isOpen: true, type, title, message, onConfirm });
            }, 100);
        } else {
            // 모달이 열려있지 않으면 바로 열기
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            showModal('error', '오류', `API 호출 중 오류가 발생했습니다: ${error.message}`);
            throw error;
        }
    };

    // 데이터 로딩
    useEffect(() => {
        const initializeData = async () => {
            // 저장된 사용자 정보 확인
            const savedUserId = localStorage.getItem('currentUserId');
            const savedUserName = localStorage.getItem('currentUserName');
            
            if (savedUserId && savedUserName) {
                setCurrentUser({ _id: savedUserId, name: savedUserName });
                // 관리자 권한 확인
                setIsAdmin(savedUserName === '관리자');
            }
            
            await Promise.all([
                loadRestaurants(),
                loadReviews()
            ]);
        };

        initializeData();
        
        // cleanup: 컴포넌트 언마운트 시 타이머 정리
        return () => {
            if (modalTimeoutRef.current) {
                clearTimeout(modalTimeoutRef.current);
            }
        };
    }, []);

    const loadRestaurants = async () => {
        try {
            const result = await apiCall('/api/restaurants');
            if (result.success) {
                setRestaurants(result.data);
            }
        } catch (error) {
            console.error('가게 목록 로딩 실패:', error);
        }
    };

    const loadReviews = async () => {
        try {
            const query = selectedRestaurant ? `restaurantId=${selectedRestaurant}&` : '';
            const result = await apiCall(`/api/reviews?${query}sortBy=${sortBy}&limit=50`);
            if (result.success) {
                setReviews(result.data);
            }
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
        }
    };

    const submitReview = async () => {
        // 이미 처리 중이면 중복 실행 방지
        if (loading) return;
        
        if (!currentUser) {
            showModal('error', '로그인 필요', '리뷰를 작성하려면 로그인이 필요합니다.');
            return;
        }

        if (!selectedRestaurant) {
            showModal('error', '가게 선택 필요', '리뷰를 작성할 가게를 선택해주세요.');
            return;
        }

        if (!newReview.content.trim()) {
            showModal('error', '내용 입력 필요', '리뷰 내용을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            const restaurant = restaurants.find(r => r._id === selectedRestaurant);
            
            const result = await apiCall('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    restaurantId: selectedRestaurant,
                    rating: newReview.rating,
                    content: newReview.content.trim()
                })
            });

            if (result.success) {
                showModal('success', '리뷰 작성 완료', '리뷰가 성공적으로 작성되었습니다!');
                setNewReview({ rating: 5, content: '' });
                await loadReviews();
            }
        } catch (error) {
            console.error('리뷰 작성 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 리뷰 삭제 (관리자만)
    const deleteReview = async (reviewId) => {
        if (!currentUser || !isAdmin) {
            showModal('error', '권한 없음', '관리자만 리뷰를 삭제할 수 있습니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/reviews/${reviewId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    userId: currentUser._id
                })
            });

            if (result.success) {
                showModal('success', '삭제 완료', '리뷰가 삭제되었습니다!');
                await loadReviews();
            }
        } catch (error) {
            console.error('리뷰 삭제 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = async (reviewId) => {
        if (!currentUser) {
            showModal('error', '로그인 필요', '좋아요를 누르려면 로그인이 필요합니다.');
            return;
        }

        try {
            const result = await apiCall(`/api/reviews/${reviewId}/like`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name
                })
            });

            if (result.success) {
                await loadReviews();
            }
        } catch (error) {
            console.error('좋아요 처리 실패:', error);
        }
    };

    // 필터 변경 시 리뷰 다시 로드
    useEffect(() => {
        loadReviews();
    }, [selectedRestaurant, sortBy]);

    const renderStars = (rating, interactive = false, onRatingChange = null) => {
        return (
            <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <span
                        key={star}
                        className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
                        onClick={interactive ? () => onRatingChange(star) : undefined}
                    >
                        ⭐
                    </span>
                ))}
            </div>
        );
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
                    <h1>리뷰 페이지</h1>
                    <p>리뷰를 보려면 먼저 메인 페이지에서 로그인해주세요.</p>
                    <a href="/">메인 페이지로 이동</a>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>리뷰 - 점심메뉴 선택기</title>
                <meta name="description" content="가게 리뷰를 확인하고 작성하세요" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="App">
                <div className="container">
                    <div className="header">
                        <a href="/" className="back-btn">← 메인으로</a>
                        <h1 className="title">📝 리뷰</h1>
                    </div>

                    {/* 리뷰 작성 폼 */}
                    <div className="review-form-section">
                        <h3>리뷰 작성</h3>
                        <div className="review-form">
                            <div className="form-group">
                                <label>가게 선택</label>
                                <select
                                    value={selectedRestaurant}
                                    onChange={(e) => setSelectedRestaurant(e.target.value)}
                                >
                                    <option value="">가게를 선택하세요</option>
                                    {restaurants.map(restaurant => (
                                        <option key={restaurant._id} value={restaurant._id}>
                                            {restaurant.name} ({restaurant.category})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>평점</label>
                                {renderStars(newReview.rating, true, (rating) => 
                                    setNewReview(prev => ({ ...prev, rating }))
                                )}
                            </div>

                            <div className="form-group">
                                <label>리뷰 내용</label>
                                <textarea
                                    value={newReview.content}
                                    onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="가게에 대한 솔직한 리뷰를 작성해주세요..."
                                    rows="4"
                                    maxLength="500"
                                />
                                <small>{newReview.content.length}/500</small>
                            </div>

                            <button
                                className="submit-review-btn"
                                onClick={submitReview}
                                disabled={loading || !selectedRestaurant || !newReview.content.trim()}
                            >
                                {loading ? '작성 중...' : '리뷰 작성'}
                            </button>
                        </div>
                    </div>

                    {/* 필터 */}
                    <div className="review-filters">
                        <div className="filter-group">
                            <label>가게 필터</label>
                            <select
                                value={selectedRestaurant}
                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                            >
                                <option value="">전체 가게</option>
                                {restaurants.map(restaurant => (
                                    <option key={restaurant._id} value={restaurant._id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>정렬</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="newest">최신순</option>
                                <option value="likes">좋아요순</option>
                                <option value="rating">평점순</option>
                            </select>
                        </div>
                    </div>

                    {/* 리뷰 목록 */}
                    <div className="reviews-section">
                        <h3>리뷰 목록 ({reviews.length}개)</h3>
                        
                        {reviews.length === 0 ? (
                            <div className="empty-reviews">
                                <p>아직 리뷰가 없습니다.</p>
                                <p>첫 번째 리뷰를 작성해보세요! ✍️</p>
                            </div>
                        ) : (
                            <div className="reviews-list">
                                {reviews.map(review => (
                                    <div key={review._id} className="review-item">
                                        <div className="review-header">
                                            <div className="review-user">
                                                <strong>{review.userName}</strong>
                                                <span className="review-date">
                                                    {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                                                </span>
                                            </div>
                                            <div className="review-restaurant">
                                                {review.restaurantName}
                                            </div>
                                        </div>
                                        
                                        <div className="review-rating">
                                            {renderStars(review.rating)}
                                            <span className="rating-text">({review.rating}/5)</span>
                                        </div>
                                        
                                        <div className="review-content">
                                            {review.content}
                                        </div>
                                        
                                        <div className="review-actions">
                                            <button
                                                className={`like-btn ${review.likes?.some(like => like.userId === currentUser._id) ? 'liked' : ''}`}
                                                onClick={() => toggleLike(review._id)}
                                            >
                                                👍 {review.likeCount || 0}
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    className="delete-review-btn"
                                                    onClick={() => showModal('confirm', '리뷰 삭제', `${review.userName}님의 리뷰를 삭제하시겠습니까?`, () => deleteReview(review._id))}
                                                    disabled={loading}
                                                >
                                                    🗑️ 삭제
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Modal />
        </>
    );
}