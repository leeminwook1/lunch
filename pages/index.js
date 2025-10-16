import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Components
import ErrorBoundary from '../components/ErrorBoundary';
import Modal from '../components/Modal';
import UserLogin from '../components/UserLogin';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantForm from '../components/RestaurantForm';
import { RestaurantListSkeleton } from '../components/SkeletonLoader';

// Hooks
import { useUser } from '../hooks/useUser';
import { useRestaurants } from '../hooks/useRestaurants';
import { useModal } from '../hooks/useModal';
import { useAnalytics } from '../lib/analytics';

export default function Home() {
    const router = useRouter();
    const analytics = useAnalytics();

    // 커스텀 훅들
    const {
        currentUser,
        isUserNameSet,
        isAdmin,
        loading: userLoading,
        isInitializing,
        nameCheckStatus,
        nameCheckMessage,
        showAdminPassword,
        checkUserName,
        createOrLoginUser,
        logout,
        apiCall
    } = useUser();

    const {
        restaurants,
        filteredAndSortedRestaurants,
        categories,
        loading: restaurantsLoading,
        filterCategory,
        setFilterCategory,
        sortBy,
        setSortBy,
        searchQuery,
        setSearchQuery,
        loadRestaurants
    } = useRestaurants();

    const { modal, showModal, closeModal, confirmModal } = useModal();

    // 로컬 상태
    const [currentView, setCurrentView] = useState('main');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [stats, setStats] = useState(null);
    const [editingRestaurant, setEditingRestaurant] = useState(null);

    // 폼 상태
    const [userName, setUserName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // 리뷰 관련 상태
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, content: '' });
    const [showReviewForm, setShowReviewForm] = useState(false);

    // 사용자 선호도 상태
    const [userPreferences, setUserPreferences] = useState(null);

    // 로그인 에러 상태
    const [loginError, setLoginError] = useState('');

    // 사용자 데이터 로딩
    const loadUserData = useCallback(async (userId) => {
        if (!userId) return;

        try {
            const statsResult = await apiCall(`/api/stats?userId=${userId}`);
            if (statsResult.success) {
                setStats(statsResult.data);
            }
        } catch (error) {
            console.error('사용자 데이터 로딩 실패:', error);
        }
    }, [apiCall]);

    // 리뷰 로딩
    const loadReviews = useCallback(async (restaurantId) => {
        try {
            const result = await apiCall(`/api/reviews?restaurantId=${restaurantId}&sortBy=newest`);
            if (result.success) {
                setReviews(result.data);
            }
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
        }
    }, [apiCall]);

    // 사용자 선호도 로딩
    const loadUserPreferences = useCallback(async () => {
        if (!currentUser) return;

        try {
            const result = await apiCall(`/api/preferences?userId=${currentUser._id}`);
            if (result.success) {
                setUserPreferences(result.data);
            }
        } catch (error) {
            console.error('선호도 로딩 실패:', error);
        }
    }, [currentUser, apiCall]);

    // 랜덤 선택
    const selectRandomRestaurant = useCallback(async () => {
        if (!currentUser) {
            showModal('error', '오류', '사용자 정보가 없습니다.');
            return;
        }

        const availableRestaurants = filteredAndSortedRestaurants;
        if (availableRestaurants.length === 0) {
            showModal('error', '선택 불가', '선택 가능한 가게가 없습니다.');
            return;
        }

        setIsSpinning(true);
        setSelectedRestaurant(null);

        // 2초 후 랜덤 선택 API 호출
        setTimeout(async () => {
            try {
                const result = await apiCall('/api/restaurants/random', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: currentUser._id,
                        userName: currentUser.name,
                        category: filterCategory !== 'all' ? filterCategory : undefined,
                        excludeRecent: false
                    })
                });

                if (result.success) {
                    setSelectedRestaurant(result.data.restaurant);
                    analytics.trackRestaurantSelection(result.data.restaurant, 'random');

                    // 데이터 새로고침
                    await Promise.all([
                        loadUserData(currentUser._id),
                        loadRestaurants()
                    ]);
                } else {
                    showModal('error', '선택 실패', result.message || '랜덤 선택에 실패했습니다.');
                }
            } catch (error) {
                console.error('랜덤 선택 실패:', error);
                showModal('error', '오류', '랜덤 선택 중 오류가 발생했습니다.');
                analytics.trackError(error, { context: 'random_selection' });
            } finally {
                setIsSpinning(false);
            }
        }, 2000);
    }, [currentUser, filteredAndSortedRestaurants, filterCategory, apiCall, showModal, analytics, loadUserData, loadRestaurants]);

    // 가게 추가
    const addRestaurant = useCallback(async (formData) => {
        if (!currentUser) {
            showModal('error', '오류', '사용자 정보가 없습니다.');
            return;
        }

        try {
            const result = await apiCall('/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    createdBy: currentUser._id
                })
            });

            if (result.success) {
                showModal('success', '추가 완료', `${formData.name}이(가) 추가되었습니다!`);
                analytics.trackRestaurantAdd(result.data);
                setCurrentView('main');
                await loadRestaurants();
            }
        } catch (error) {
            console.error('가게 추가 실패:', error);
            analytics.trackError(error, { context: 'add_restaurant' });
        }
    }, [currentUser, apiCall, showModal, analytics, loadRestaurants]);

    // 가게 수정
    const updateRestaurant = useCallback(async (formData) => {
        if (!editingRestaurant) return;

        try {
            const result = await apiCall(`/api/restaurants/${editingRestaurant._id}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (result.success) {
                showModal('success', '수정 완료', '가게 정보가 수정되었습니다!');
                setEditingRestaurant(null);
                setCurrentView('main');
                await loadRestaurants();

                // 상세보기 중인 가게라면 업데이트
                if (selectedRestaurantDetail && selectedRestaurantDetail._id === editingRestaurant._id) {
                    setSelectedRestaurantDetail(result.data);
                }
            }
        } catch (error) {
            console.error('가게 수정 실패:', error);
            analytics.trackError(error, { context: 'update_restaurant' });
        }
    }, [editingRestaurant, apiCall, showModal, analytics, loadRestaurants, selectedRestaurantDetail]);

    // 가게 삭제
    const deleteRestaurant = useCallback(async (id, name) => {
        showModal('confirm', '가게 삭제', `${name}을(를) 삭제하시겠습니까?`, async () => {
            try {
                const result = await apiCall(`/api/restaurants/${id}`, { method: 'DELETE' });

                if (result.success) {
                    showModal('success', '삭제 완료', '가게가 삭제되었습니다!');
                    await loadRestaurants();
                }
            } catch (error) {
                console.error('가게 삭제 실패:', error);
                analytics.trackError(error, { context: 'delete_restaurant' });
            }
        });
    }, [apiCall, showModal, analytics, loadRestaurants]);

    // 가게 상세보기
    const viewRestaurantDetail = useCallback(async (restaurant) => {
        setSelectedRestaurantDetail(restaurant);
        setCurrentView('detail');
        await loadReviews(restaurant._id);
    }, [loadReviews]);

    // 리뷰 작성
    const submitReview = useCallback(async () => {
        if (!currentUser || !selectedRestaurantDetail) {
            showModal('error', '오류', '사용자 정보나 가게 정보가 없습니다.');
            return;
        }

        if (!newReview.content.trim()) {
            showModal('error', '입력 오류', '리뷰 내용을 입력해주세요.');
            return;
        }

        try {
            const result = await apiCall('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    restaurantId: selectedRestaurantDetail._id,
                    rating: newReview.rating,
                    content: newReview.content.trim()
                })
            });

            if (result.success) {
                showModal('success', '리뷰 작성 완료', '리뷰가 성공적으로 작성되었습니다!');
                setNewReview({ rating: 5, content: '' });
                setShowReviewForm(false);
                await Promise.all([
                    loadReviews(selectedRestaurantDetail._id),
                    loadRestaurants() // 가게 평점 업데이트 반영
                ]);
                analytics.trackReviewSubmit(result.data);
            }
        } catch (error) {
            console.error('리뷰 작성 실패:', error);
            analytics.trackError(error, { context: 'submit_review' });
        }
    }, [currentUser, selectedRestaurantDetail, newReview, apiCall, showModal, loadReviews, loadRestaurants, analytics]);

    // 사용자 로그인 처리
    const handleUserLogin = useCallback(async (name, password = '') => {
        try {
            // 관리자인 경우 전달받은 password 사용, 아니면 기존 adminPassword 사용
            const passwordToUse = name.trim() === '관리자' ? (password || adminPassword) : '';
            const user = await createOrLoginUser(name, passwordToUse);
            analytics.setUserId(user._id);
            analytics.trackUserLogin(user);
            await Promise.all([
                loadUserData(user._id),
                loadUserPreferences()
            ]);
        } catch (error) {
            // 에러 메시지를 사용자 친화적으로 변경
            let friendlyMessage = '로그인에 실패했습니다.';

            if (error.message.includes('관리자 비밀번호')) {
                friendlyMessage = '관리자 비밀번호가 올바르지 않습니다.';
            } else if (error.message.includes('비밀번호를 입력')) {
                friendlyMessage = '관리자 비밀번호를 입력해주세요.';
            } else if (error.message.includes('네트워크')) {
                friendlyMessage = '네트워크 연결을 확인해주세요.';
            } else if (error.message.includes('서버')) {
                friendlyMessage = '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
            }

            setLoginError(friendlyMessage);
            analytics.trackError(error, { context: 'user_login' });
        }
    }, [createOrLoginUser, adminPassword, analytics, loadUserData, loadUserPreferences, showModal]);

    // 사용자 변경
    const changeUser = useCallback(() => {
        showModal('confirm', '사용자 변경', '사용자를 변경하시겠습니까?', () => {
            logout();
            setStats(null);
            setUserName('');
            setAdminPassword('');
            setUserPreferences(null);
        });
    }, [showModal, logout]);

    // 초기 로딩 완료 후 사용자 데이터 로딩
    useEffect(() => {
        if (currentUser && !isInitializing) {
            loadUserData(currentUser._id);
            loadUserPreferences();
            analytics.setUserId(currentUser._id);
        }
    }, [currentUser, isInitializing, loadUserData, loadUserPreferences, analytics]);

    // URL 파라미터 처리
    useEffect(() => {
        if (router.isReady && router.query.restaurantId && restaurants.length > 0) {
            const restaurantId = router.query.restaurantId;
            const restaurant = restaurants.find(r => r._id === restaurantId);
            if (restaurant) {
                viewRestaurantDetail(restaurant);
                router.replace('/', undefined, { shallow: true });
            }
        }
    }, [router.isReady, router.query.restaurantId, restaurants, router, viewRestaurantDetail]);

    // 페이지네이션 계산
    const totalPages = Math.ceil(filteredAndSortedRestaurants.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRestaurants = filteredAndSortedRestaurants.slice(startIndex, startIndex + itemsPerPage);

    // 로딩 중이면 스켈레톤 표시
    if (isInitializing) {
        return (
            <div className="app">
                <div className="container">
                    <RestaurantListSkeleton count={6} />
                </div>
            </div>
        );
    }

    // 사용자 로그인이 필요한 경우
    if (!isUserNameSet) {
        return (
            <ErrorBoundary>
                <Head>
                    <title>점심메뉴 선택기 - 로그인</title>
                    <meta name="description" content="점심메뉴를 랜덤으로 선택해주는 서비스" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>

                <UserLogin
                    userName={userName}
                    setUserName={setUserName}
                    nameCheckStatus={nameCheckStatus}
                    nameCheckMessage={nameCheckMessage}
                    showAdminPassword={showAdminPassword}
                    adminPassword={adminPassword}
                    setAdminPassword={setAdminPassword}
                    onCheckUserName={checkUserName}
                    onSetUserName={handleUserLogin}
                    errorMessage={loginError}
                    onClearError={() => setLoginError('')}
                />

                <Modal
                    modal={modal}
                    closeModal={closeModal}
                    confirmModal={confirmModal}
                />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <Head>
                <title>점심메뉴 선택기</title>
                <meta name="description" content="점심메뉴를 랜덤으로 선택해주는 서비스" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="app">
                <div className="container">
                    {/* 헤더 */}
                    <header className="header">
                        <div className="header-content">
                            <div className="header-left">
                                <h1 className="title">🍽️ 점심메뉴 선택기</h1>
                                <div className="user-info">
                                    <span className="user-greeting">안녕하세요, <strong>{currentUser?.name}</strong>님!</span>
                                    {isAdmin && <span className="admin-badge">관리자</span>}
                                </div>
                            </div>
                            <div className="header-right">
                                <button onClick={changeUser} className="btn-change-user">
                                    👤 사용자 변경
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* 메인 뷰 */}
                    {currentView === 'main' && (
                        <main className="main-content">
                            {/* 랜덤 선택 섹션 */}
                            <section className="hero-section">
                                <div className="hero-content">
                                    {isSpinning ? (
                                        <div className="spinning-wheel">
                                            <div className="spinner"></div>
                                            <h2>🎲 선택 중...</h2>
                                            <p>잠시만 기다려주세요!</p>
                                        </div>
                                    ) : selectedRestaurant ? (
                                        <div className="selected-result">
                                            <h2>🎉 오늘의 선택!</h2>
                                            <div className="selected-card">
                                                <RestaurantCard
                                                    restaurant={selectedRestaurant}
                                                    onViewDetail={viewRestaurantDetail}
                                                    isAdmin={isAdmin}
                                                    currentUser={currentUser}
                                                    onEdit={(restaurant) => {
                                                        setEditingRestaurant(restaurant);
                                                        setCurrentView('edit');
                                                    }}
                                                    onDelete={deleteRestaurant}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="hero-placeholder">
                                            <h2>🎲 오늘 뭐 먹을까요?</h2>
                                            <p>버튼을 눌러 오늘의 점심을 선택해보세요!</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={selectRandomRestaurant}
                                        disabled={isSpinning || filteredAndSortedRestaurants.length === 0}
                                        className="btn-random"
                                    >
                                        {isSpinning ? '선택 중...' : '🎲 랜덤 선택'}
                                    </button>
                                </div>
                            </section>

                            {/* 액션 버튼들 */}
                            <section className="action-section">
                                <div className="action-grid">
                                    <button
                                        onClick={() => setCurrentView('add')}
                                        className="action-btn add-btn"
                                    >
                                        <span className="action-icon">➕</span>
                                        <span className="action-text">가게 추가</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/vote')}
                                        className="action-btn vote-btn"
                                    >
                                        <span className="action-icon">🗳️</span>
                                        <span className="action-text">점심 메뉴 투표</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/vote-date')}
                                        className="action-btn vote-date-btn"
                                    >
                                        <span className="action-icon">📅</span>
                                        <span className="action-text">회식 날짜 투표</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/slot')}
                                        className="action-btn game-btn"
                                    >
                                        <span className="action-icon">🃏</span>
                                        <span className="action-text">카드 뽑기</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/worldcup')}
                                        className="action-btn game-btn"
                                    >
                                        <span className="action-icon">🏆</span>
                                        <span className="action-text">월드컵</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/reviews')}
                                        className="action-btn review-btn"
                                    >
                                        <span className="action-icon">⭐</span>
                                        <span className="action-text">리뷰 보기</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/feedback')}
                                        className="action-btn feedback-btn"
                                    >
                                        <span className="action-icon">📝</span>
                                        <span className="action-text">피드백</span>
                                    </button>

                                    <button
                                        onClick={() => router.push('/calendar')}
                                        className="action-btn calendar-btn"
                                    >
                                        <span className="action-icon">📅</span>
                                        <span className="action-text">방문 달력</span>
                                    </button>


                                </div>
                            </section>

                            {/* 필터 및 검색 */}
                            <section className="filter-section">
                                <div className="filter-header">
                                    <h3>🔍 가게 찾기</h3>
                                </div>
                                <div className="filter-controls">
                                    <div className="search-box">
                                        <input
                                            type="text"
                                            placeholder="가게 이름 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="search-input"
                                        />
                                    </div>

                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">전체 카테고리</option>
                                        {categories.map(category => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="sort-select"
                                    >
                                        <option value="name">이름순</option>
                                        <option value="distance">거리순</option>
                                        <option value="newest">최신순</option>
                                    </select>
                                </div>
                            </section>

                            {/* 가게 목록 */}
                            <section className="restaurants-section">
                                <div className="section-header">
                                    <h3>🏪 가게 목록</h3>
                                    <span className="count-badge">{filteredAndSortedRestaurants.length}개</span>
                                </div>

                                {restaurantsLoading ? (
                                    <RestaurantListSkeleton count={6} />
                                ) : paginatedRestaurants.length > 0 ? (
                                    <>
                                        <div className="restaurants-grid">
                                            {paginatedRestaurants.map(restaurant => (
                                                <RestaurantCard
                                                    key={restaurant._id}
                                                    restaurant={restaurant}
                                                    onViewDetail={viewRestaurantDetail}
                                                    isAdmin={isAdmin}
                                                    currentUser={currentUser}
                                                    onEdit={(restaurant) => {
                                                        setEditingRestaurant(restaurant);
                                                        setCurrentView('edit');
                                                    }}
                                                    onDelete={deleteRestaurant}
                                                />
                                            ))}
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
                                    </>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">🔍</div>
                                        <h4>조건에 맞는 가게가 없습니다</h4>
                                        <p>다른 검색어나 카테고리를 시도해보세요</p>
                                        <button
                                            onClick={() => {
                                                setFilterCategory('all');
                                                setSearchQuery('');
                                            }}
                                            className="btn-reset-filter"
                                        >
                                            필터 초기화
                                        </button>
                                    </div>
                                )}
                            </section>


                        </main>
                    )}

                    {/* 가게 추가 뷰 */}
                    {currentView === 'add' && (
                        <div className="form-view">
                            <div className="form-header">
                                <button
                                    onClick={() => setCurrentView('main')}
                                    className="btn-back"
                                >
                                    ← 돌아가기
                                </button>
                                <h2>새 가게 추가</h2>
                            </div>
                            <RestaurantForm
                                onSubmit={addRestaurant}
                                onCancel={() => setCurrentView('main')}
                                loading={userLoading}
                            />
                        </div>
                    )}

                    {/* 가게 수정 뷰 */}
                    {currentView === 'edit' && editingRestaurant && (
                        <div className="form-view">
                            <div className="form-header">
                                <button
                                    onClick={() => {
                                        setEditingRestaurant(null);
                                        setCurrentView('main');
                                    }}
                                    className="btn-back"
                                >
                                    ← 돌아가기
                                </button>
                                <h2>가게 정보 수정</h2>
                            </div>
                            <RestaurantForm
                                initialData={editingRestaurant}
                                onSubmit={updateRestaurant}
                                onCancel={() => {
                                    setEditingRestaurant(null);
                                    setCurrentView('main');
                                }}
                                loading={userLoading}
                            />
                        </div>
                    )}

                    {/* 가게 상세보기 뷰 */}
                    {currentView === 'detail' && selectedRestaurantDetail && (
                        <div className="detail-view">
                            <div className="detail-header">
                                <button
                                    onClick={() => {
                                        setSelectedRestaurantDetail(null);
                                        setCurrentView('main');
                                    }}
                                    className="btn-back"
                                >
                                    ← 돌아가기
                                </button>
                                <h2>{selectedRestaurantDetail.name}</h2>
                            </div>

                            <div className="detail-content">
                                <div className="detail-main">
                                    <div className="restaurant-image-large">
                                        <img
                                            src={selectedRestaurantDetail.image}
                                            alt={selectedRestaurantDetail.name}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
                                            }}
                                        />
                                        <div className="restaurant-category-large">
                                            {selectedRestaurantDetail.category}
                                        </div>
                                    </div>

                                    <div className="restaurant-info-large">
                                        <div className="info-row">
                                            <span className="info-label">🚶‍♂️ 거리</span>
                                            <span className="info-value">{selectedRestaurantDetail.distance}</span>
                                        </div>

                                        {selectedRestaurantDetail.description && (
                                            <div className="info-row">
                                                <span className="info-label">📝 설명</span>
                                                <span className="info-value">{selectedRestaurantDetail.description}</span>
                                            </div>
                                        )}

                                        {selectedRestaurantDetail.websiteUrl && (
                                            <div className="info-row">
                                                <span className="info-label">🌐 웹사이트</span>
                                                <a
                                                    href={selectedRestaurantDetail.websiteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="info-link"
                                                >
                                                    방문하기
                                                </a>
                                            </div>
                                        )}

                                        <div className="restaurant-stats-large">
                                            <div className="stat-item">
                                                <span className="stat-icon">⭐</span>
                                                <span className="stat-text">
                                                    {selectedRestaurantDetail.averageRating?.toFixed(1) || '0.0'}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-icon">💬</span>
                                                <span className="stat-text">
                                                    {selectedRestaurantDetail.reviewCount || 0}개 리뷰
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-icon">👍</span>
                                                <span className="stat-text">
                                                    {selectedRestaurantDetail.totalLikes || 0}개 좋아요
                                                </span>
                                            </div>
                                        </div>

                                        <div className="detail-actions">
                                            <button
                                                onClick={() => setShowReviewForm(true)}
                                                className="btn-write-review"
                                            >
                                                ⭐ 리뷰 작성
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 리뷰 섹션 */}
                                <div className="reviews-section">
                                    <div className="reviews-header">
                                        <h3>💬 리뷰 ({reviews.length}개)</h3>
                                    </div>

                                    {showReviewForm && (
                                        <div className="review-form">
                                            <h4>리뷰 작성</h4>
                                            <div className="rating-input">
                                                <label>평점:</label>
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
                                                </div>
                                            </div>
                                            <textarea
                                                value={newReview.content}
                                                onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                                                placeholder="리뷰를 작성해주세요..."
                                                className="review-textarea"
                                                rows={4}
                                            />
                                            <div className="review-form-actions">
                                                <button
                                                    onClick={() => setShowReviewForm(false)}
                                                    className="btn-cancel"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={submitReview}
                                                    className="btn-submit"
                                                    disabled={!newReview.content.trim()}
                                                >
                                                    작성
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="reviews-list">
                                        {reviews.length > 0 ? (
                                            reviews.map(review => (
                                                <div key={review._id} className="review-item">
                                                    <div className="review-header">
                                                        <div className="review-author">
                                                            <span className="author-name">{review.userName}</span>
                                                            <div className="review-rating">
                                                                {'⭐'.repeat(review.rating)}
                                                            </div>
                                                        </div>
                                                        <span className="review-date">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="review-content">
                                                        {review.content}
                                                    </div>
                                                    <div className="review-actions">
                                                        <span className="like-count">
                                                            👍 {review.likeCount || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-reviews">
                                                <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>



            <Modal
                modal={modal}
                closeModal={closeModal}
                confirmModal={confirmModal}
            />
        </ErrorBoundary>
    );
}