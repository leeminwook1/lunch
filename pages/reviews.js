import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Reviews() {
    const router = useRouter();
    const [reviews, setReviews] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState('');
    const [newReview, setNewReview] = useState({ rating: 5, content: '' });
    const [sortBy, setSortBy] = useState('newest');
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [isAdmin, setIsAdmin] = useState(false);
    
    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
                setLoading(true);
                
                // 사용자 정보 복원
                const savedUserId = localStorage.getItem('currentUserId');
                const savedUserName = localStorage.getItem('currentUserName');
                
                if (savedUserId && savedUserName) {
                    const userResult = await apiCall('/api/users', {
                        method: 'POST',
                        body: JSON.stringify({ name: savedUserName })
                    });
                    
                    if (userResult.success) {
                        setCurrentUser(userResult.data);
                        setIsAdmin(userResult.data.role === 'admin');
                    }
                }

                // 가게 목록 로딩
                const restaurantsResult = await apiCall('/api/restaurants');
                if (restaurantsResult.success) {
                    setRestaurants(restaurantsResult.data);
                }

                // 리뷰 목록 로딩
                await loadReviews();
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, []);

    // 리뷰 로딩
    const loadReviews = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedRestaurant) {
                params.append('restaurantId', selectedRestaurant);
            }
            params.append('sortBy', sortBy);
            
            const queryString = params.toString();
            const url = queryString ? `/api/reviews?${queryString}` : '/api/reviews';
            
            const result = await apiCall(url);
            if (result.success) {
                setReviews(result.data);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
        }
    };

    // 리뷰 작성
    const submitReview = async () => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        if (!selectedRestaurant) {
            showModal('error', '입력 오류', '가게를 선택해주세요.');
            return;
        }

        if (!newReview.content.trim()) {
            showModal('error', '입력 오류', '리뷰 내용을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
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

    // 리뷰 좋아요 토글
    const toggleReviewLike = async (reviewId) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
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
                setReviews(prevReviews =>
                    prevReviews.map(review =>
                        review._id === reviewId
                            ? {
                                ...review,
                                likeCount: result.data.likeCount,
                                likes: result.data.action === 'liked'
                                    ? [...review.likes, { userId: currentUser._id, userName: currentUser.name }]
                                    : review.likes.filter(like => like.userId !== currentUser._id)
                            }
                            : review
                    )
                );
            }
        } catch (error) {
            console.error('좋아요 처리 실패:', error);
        }
    };

    // 리뷰 삭제
    const deleteReview = async (reviewId, isOwnReview = false) => {
        if (!currentUser) {
            showModal('error', '로그인 필요', '로그인이 필요합니다.');
            return;
        }

        if (!isAdmin && !isOwnReview) {
            showModal('error', '권한 없음', '본인의 리뷰만 삭제할 수 있습니다.');
            return;
        }

        showModal('confirm', '리뷰 삭제', '정말로 이 리뷰를 삭제하시겠습니까?', async () => {
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
        });
    };

    // 필터 변경 시 리뷰 다시 로딩
    useEffect(() => {
        if (restaurants.length > 0) {
            loadReviews();
        }
    }, [selectedRestaurant, sortBy]);

    // 페이지네이션 계산
    const totalPages = Math.ceil(reviews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedReviews = reviews.slice(startIndex, startIndex + itemsPerPage);

    // 선택된 가게 정보 가져오기
    const getSelectedRestaurantInfo = () => {
        if (!selectedRestaurant) return null;
        return restaurants.find(r => r._id === selectedRestaurant);
    };

    const selectedRestaurantInfo = getSelectedRestaurantInfo();

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
                <title>리뷰 - 점심메뉴 선택기</title>
                <meta name="description" content="가게 리뷰를 확인하고 작성해보세요!" />
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
                                <h1 className="title">⭐ 리뷰</h1>
                                {currentUser && (
                                    <div className="user-info">
                                        <span className="user-greeting">안녕하세요, <strong>{currentUser.name}</strong>님!</span>
                                        {isAdmin && <span className="admin-badge">관리자</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* 메인 콘텐츠 */}
                    <main className="main-content">
                        {/* 리뷰 작성 섹션 */}
                        {currentUser && (
                            <section className="review-write-section">
                                <div className="section-header">
                                    <h2>✍️ 리뷰 작성</h2>
                                </div>
                                
                                <div className="review-form">
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label htmlFor="restaurant-select">가게 선택</label>
                                            <select
                                                id="restaurant-select"
                                                value={selectedRestaurant}
                                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                                                className="restaurant-select"
                                            >
                                                <option value="">가게를 선택하세요</option>
                                                {restaurants.map(restaurant => (
                                                    <option key={restaurant._id} value={restaurant._id}>
                                                        {restaurant.name} ({restaurant.category})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {selectedRestaurantInfo && (
                                        <div className="selected-restaurant-info">
                                            <img 
                                                src={selectedRestaurantInfo.image} 
                                                alt={selectedRestaurantInfo.name}
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                                                }}
                                            />
                                            <div className="restaurant-details">
                                                <h3>{selectedRestaurantInfo.name}</h3>
                                                <p className="category">{selectedRestaurantInfo.category}</p>
                                                <p className="distance">🚶‍♂️ {selectedRestaurantInfo.distance}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <label>평점</label>
                                        <div className="star-rating">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                                    className={`star ${star <= newReview.rating ? 'active' : ''}`}
                                                >
                                                    ⭐
                                                </button>
                                            ))}
                                            <span className="rating-text">({newReview.rating}점)</span>
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="review-content">리뷰 내용</label>
                                        <textarea
                                            id="review-content"
                                            value={newReview.content}
                                            onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="가게에 대한 솔직한 리뷰를 작성해주세요..."
                                            className="review-textarea"
                                            rows={4}
                                            maxLength={500}
                                        />
                                        <div className="char-count">
                                            {newReview.content.length}/500
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button 
                                            onClick={submitReview}
                                            disabled={loading || !selectedRestaurant || !newReview.content.trim()}
                                            className="btn-submit-review"
                                        >
                                            {loading ? '작성 중...' : '⭐ 리뷰 작성'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 리뷰 목록 섹션 */}
                        <section className="reviews-list-section">
                            <div className="section-header">
                                <h2>💬 리뷰 목록</h2>
                                <span className="count-badge">{reviews.length}개</span>
                            </div>

                            {/* 필터 */}
                            <div className="reviews-filters">
                                <select
                                    value={selectedRestaurant}
                                    onChange={(e) => setSelectedRestaurant(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="">전체 가게</option>
                                    {restaurants.map(restaurant => (
                                        <option key={restaurant._id} value={restaurant._id}>
                                            {restaurant.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="sort-select"
                                >
                                    <option value="newest">최신순</option>
                                    <option value="oldest">오래된순</option>
                                    <option value="rating_high">평점 높은순</option>
                                    <option value="rating_low">평점 낮은순</option>
                                    <option value="likes">좋아요순</option>
                                </select>
                            </div>

                            {/* 리뷰 목록 */}
                            <div className="reviews-list">
                                {loading ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>리뷰를 불러오는 중...</p>
                                    </div>
                                ) : paginatedReviews.length > 0 ? (
                                    paginatedReviews.map(review => (
                                        <div key={review._id} className="review-item">
                                            <div className="review-header">
                                                <div className="review-author">
                                                    <span className="author-name">{review.userName}</span>
                                                    <div className="review-rating">
                                                        {'⭐'.repeat(review.rating)}
                                                        <span className="rating-number">({review.rating})</span>
                                                    </div>
                                                </div>
                                                <div className="review-meta">
                                                    <span className="review-date">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {(isAdmin || review.userId === currentUser?._id) && (
                                                        <button
                                                            onClick={() => deleteReview(review._id, review.userId === currentUser?._id)}
                                                            className="btn-delete-review"
                                                            title="삭제"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="review-restaurant">
                                                <span className="restaurant-name">
                                                    🏪 {review.restaurantName || '알 수 없는 가게'}
                                                </span>
                                            </div>
                                            
                                            <div className="review-content">
                                                {review.content}
                                            </div>
                                            
                                            <div className="review-actions">
                                                <button
                                                    onClick={() => toggleReviewLike(review._id)}
                                                    className={`btn-like ${review.likes?.some(like => like.userId === currentUser?._id) ? 'liked' : ''}`}
                                                    disabled={!currentUser}
                                                >
                                                    👍 {review.likeCount || 0}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">💬</div>
                                        <h4>리뷰가 없습니다</h4>
                                        <p>첫 번째 리뷰를 작성해보세요!</p>
                                    </div>
                                )}
                            </div>

                            {/* 페이지네이션 */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                    >
                                        ← 이전
                                    </button>
                                    
                                    <span className="pagination-info">
                                        {currentPage} / {totalPages}
                                    </span>
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                    >
                                        다음 →
                                    </button>
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>

            <Modal />
        </>
    );
}