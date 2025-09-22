import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';

export default function Home() {
    // 상태 관리
    const [restaurants, setRestaurants] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [visitHistory, setVisitHistory] = useState([]);
    const [recentSelections, setRecentSelections] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // UI 상태
    const [currentView, setCurrentView] = useState('main');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 필터 및 정렬
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    // 폼 상태
    const [newRestaurant, setNewRestaurant] = useState('');
    const [newWalkTime, setNewWalkTime] = useState('');
    const [newImage, setNewImage] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newWebsiteUrl, setNewWebsiteUrl] = useState('');

    // 사용자 관리
    const [userName, setUserName] = useState('');
    const [isUserNameSet, setIsUserNameSet] = useState(false);
    const [nameCheckStatus, setNameCheckStatus] = useState(''); // 'checking', 'available', 'exists', 'invalid'
    const [nameCheckMessage, setNameCheckMessage] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // 리뷰 관련 상태
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, content: '' });
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    // 관리자 및 선호도 관련 상태
    const [isAdmin, setIsAdmin] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferencesTimer, setPreferencesTimer] = useState(null);

    // 가게 수정 관련 상태
    const [showEditRestaurant, setShowEditRestaurant] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState(null);

    // API 호출 함수들
    const apiCall = async (endpoint, options = {}) => {
        try {
            // 절대 경로로 변환
            const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API 오류 [${response.status}]:`, errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            showModal('error', '오류', `API 호출 중 오류가 발생했습니다: ${error.message}`);
            throw error;
        }
    };

    // 데이터 로딩 함수들
    const loadRestaurants = async () => {
        try {
            const params = new URLSearchParams();
            if (filterCategory && filterCategory !== 'all') {
                params.append('category', filterCategory);
            }
            if (sortBy) {
                params.append('sortBy', sortBy);
            }
            if (searchQuery && searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }
            
            const queryString = params.toString();
            const url = queryString ? `/api/restaurants?${queryString}` : '/api/restaurants';
            
            const result = await apiCall(url);
            if (result.success) {
                setRestaurants(result.data);
            }
        } catch (error) {
            console.error('가게 목록 로딩 실패:', error);
        }
    };

    const loadUserData = async (userId) => {
        if (!userId) return;

        try {
            const [visitsResult, statsResult, selectionsResult] = await Promise.all([
                apiCall(`/api/visits?userId=${userId}`),
                apiCall(`/api/stats?userId=${userId}`),
                apiCall('/api/selections?limit=10')
            ]);

            if (visitsResult.success) {
                setVisitHistory(visitsResult.data);
            }

            if (statsResult.success) {
                setStats(statsResult.data);
            }

            if (selectionsResult.success) {
                setRecentSelections(selectionsResult.data);
            }
        } catch (error) {
            console.error('사용자 데이터 로딩 실패:', error);
        }
    };

    const initializeSampleData = async () => {
        try {
            setLoading(true);
            const result = await apiCall('/api/init/sample-data', { method: 'POST', body: JSON.stringify({}) });
            if (result.success) {
                showModal('success', '초기화 완료', '샘플 데이터가 생성되었습니다!');
                await loadRestaurants();
            }
        } catch (error) {
            console.error('샘플 데이터 초기화 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 리뷰 관련 함수들
    const loadReviews = async (restaurantId) => {
        try {
            const result = await apiCall(`/api/reviews?restaurantId=${restaurantId}&sortBy=newest`);
            if (result.success) {
                setReviews(result.data);
            }
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
        }
    };

    const submitReview = async () => {
        if (!currentUser || !selectedRestaurantDetail) {
            showModal('error', '오류', '사용자 정보나 가게 정보가 없습니다.');
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
            }
        } catch (error) {
            console.error('리뷰 작성 실패:', error);
        } finally {
            setLoading(false);
        }
    };

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
                // 리뷰 목록에서 해당 리뷰의 좋아요 수 업데이트
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



    // 사용자 선호도 로딩
    const loadUserPreferences = async () => {
        if (!currentUser) return;

        try {
            const result = await apiCall(`/api/preferences?userId=${currentUser._id}`);
            if (result.success) {
                setUserPreferences(result.data);
            }
        } catch (error) {
            console.error('선호도 로딩 실패:', error);
        }
    };

    // 선호도 업데이트 (디바운싱 적용) - useCallback으로 최적화
    const updateUserPreferences = useCallback((newPreferences) => {
        if (!currentUser) return;

        // 기존 타이머 취소
        if (preferencesTimer) {
            clearTimeout(preferencesTimer);
        }

        // 즉시 UI 업데이트 (깜빡임 방지)
        setUserPreferences(prev => ({
            ...prev,
            preferences: {
                ...prev?.preferences,
                ...newPreferences
            }
        }));

        // 새 타이머 설정 (API 호출)
        const timer = setTimeout(async () => {
            try {
                const result = await apiCall('/api/preferences', {
                    method: 'PUT',
                    body: JSON.stringify({
                        userId: currentUser._id,
                        preferences: newPreferences
                    })
                });

                // API 응답으로 최종 상태 업데이트
                if (result.success) {
                    setUserPreferences(result.data);
                }
            } catch (error) {
                console.error('선호도 업데이트 실패:', error);
                // 실패 시 이전 상태로 복원
                loadUserPreferences();
            }
        }, 500);

        setPreferencesTimer(timer);
    }, [currentUser, preferencesTimer, apiCall, loadUserPreferences]);

    // 가게 수정
    const updateRestaurant = async (restaurantData) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/restaurants/${restaurantData._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: restaurantData.name,
                    distance: restaurantData.distance,
                    category: restaurantData.category,
                    image: restaurantData.image,
                    description: restaurantData.description,
                    websiteUrl: restaurantData.websiteUrl
                })
            });

            if (result.success) {
                showModal('success', '수정 완료', '가게 정보가 수정되었습니다!');
                setShowEditRestaurant(false);
                setEditingRestaurant(null);
                await loadRestaurants();

                // 상세보기 중인 가게라면 업데이트
                if (selectedRestaurantDetail && selectedRestaurantDetail._id === restaurantData._id) {
                    setSelectedRestaurantDetail(result.data);
                }
            }
        } catch (error) {
            console.error('가게 수정 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 리뷰 삭제 (관리자 또는 본인)
    const deleteReview = async (reviewId, isOwnReview = false) => {
        if (!currentUser) {
            showModal('error', '로그인 필요', '로그인이 필요합니다.');
            return;
        }

        if (!isAdmin && !isOwnReview) {
            showModal('error', '권한 없음', '본인의 리뷰만 삭제할 수 있습니다.');
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
                if (selectedRestaurantDetail) {
                    await loadReviews(selectedRestaurantDetail._id);
                }
            }
        } catch (error) {
            console.error('리뷰 삭제 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 가게 제외/포함
    const toggleRestaurantExclusion = async (restaurantId, action, reason = '') => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall('/api/preferences/exclude', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    restaurantId,
                    action,
                    reason
                })
            });

            if (result.success) {
                setUserPreferences(result.data);
                showModal('success', '설정 완료', result.message);
            }
        } catch (error) {
            console.error('가게 제외/포함 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 사용자 관리 함수들
    const createOrLoginUser = async (name) => {
        try {
            const result = await apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim() })
            });

            if (result.success) {
                setCurrentUser(result.data);
                setUserName(result.data.name);
                setIsUserNameSet(true);
                setIsAdmin(result.data.role === 'admin');
                localStorage.setItem('currentUserId', result.data._id);
                localStorage.setItem('currentUserName', result.data.name);
                await Promise.all([
                    loadUserData(result.data._id),
                    loadUserPreferences()
                ]);
                return result.data;
            }
        } catch (error) {
            console.error('사용자 생성/로그인 실패:', error);
            throw error;
        }
    };

    // 사용자 이름 중복체크
    const checkUserName = async (name) => {
        if (!name || name.trim().length < 2) {
            setNameCheckStatus('invalid');
            setNameCheckMessage('이름은 2글자 이상 입력해주세요');
            return;
        }

        try {
            setNameCheckStatus('checking');
            setNameCheckMessage('확인 중...');

            const result = await apiCall('/api/users/check', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim() })
            });

            if (result.success) {
                if (result.exists) {
                    setNameCheckStatus('exists');
                    if (name.trim() === '관리자') {
                        setNameCheckMessage('관리자 계정입니다. 비밀번호를 입력해주세요.');
                        setShowAdminPassword(true);
                    } else {
                        setNameCheckMessage(`기존 사용자입니다 (마지막 로그인: ${new Date(result.data.lastLoginAt).toLocaleDateString()})`);
                        setShowAdminPassword(false);
                    }
                } else {
                    setNameCheckStatus('available');
                    if (name.trim() === '관리자') {
                        setNameCheckMessage('새 관리자 계정을 생성합니다. 비밀번호를 설정해주세요.');
                        setShowAdminPassword(true);
                    } else {
                        setNameCheckMessage('사용 가능한 이름입니다');
                        setShowAdminPassword(false);
                    }
                }
            }
        } catch (error) {
            console.error('이름 확인 오류:', error);
            setNameCheckStatus('available'); // 오류 시에도 진행할 수 있도록
            setNameCheckMessage('이름 확인 중 오류가 발생했지만 계속 진행할 수 있습니다');
        }
    };

    const setUserNameHandler = async (name) => {
        if (!name.trim()) {
            showModal('error', '입력 오류', '사용자 이름을 입력해주세요.');
            return;
        }

        // 이름 체크가 아직 안 되었거나 진행 중인 경우 먼저 체크 실행
        if (!nameCheckStatus || nameCheckStatus === 'checking') {
            await checkUserName(name.trim());
            // 체크 후 다시 한 번 확인
            if (nameCheckStatus !== 'available' && nameCheckStatus !== 'exists') {
                return; // 체크 결과를 기다림
            }
        }

        // 유효하지 않은 이름인 경우
        if (nameCheckStatus === 'invalid') {
            showModal('error', '입력 오류', nameCheckMessage || '올바른 사용자 이름을 입력해주세요.');
            return;
        }

        // 관리자 계정인 경우 비밀번호 확인
        if (name.trim() === '관리자') {
            if (!adminPassword.trim()) {
                showModal('error', '비밀번호 필요', '관리자 비밀번호를 입력해주세요.');
                return;
            }

            if (adminPassword.trim() !== '123') {
                showModal('error', '비밀번호 오류', '관리자 비밀번호가 올바르지 않습니다.');
                return;
            }
        }

        try {
            await createOrLoginUser(name.trim());
        } catch (error) {
            showModal('error', '오류', '사용자 설정에 실패했습니다.');
        }
    };

    const changeUserName = () => {
        showModal('confirm', '사용자 변경', '사용자를 변경하시겠습니까?', () => {
            setIsUserNameSet(false);
            setCurrentUser(null);
            setUserName('');
            setVisitHistory([]);
            setRecentSelections([]);
            setStats(null);
            setIsAdmin(false);
            setUserPreferences(null);
            setNameCheckStatus('');
            setNameCheckMessage('');
            setShowAdminPassword(false);
            setAdminPassword('');
            setIsInitializing(false); // 로그아웃 시에는 초기화 상태를 false로 설정
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUserName');
        });
    };

    // 가게 관리 함수들
    const addRestaurant = async () => {
        if (!newRestaurant.trim() || !newWalkTime.trim() || !newCategory || !newImage.trim()) {
            showModal('error', '입력 오류', '모든 필드를 입력해주세요.');
            return;
        }

        if (!currentUser) {
            showModal('error', '오류', '사용자 정보가 없습니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall('/api/restaurants', {
                method: 'POST',
                body: JSON.stringify({
                    name: newRestaurant.trim(),
                    distance: newWalkTime.trim(),
                    category: newCategory,
                    image: newImage.trim(),
                    description: newDescription.trim(),
                    websiteUrl: newWebsiteUrl.trim(),
                    createdBy: currentUser._id
                })
            });

            if (result.success) {
                showModal('success', '추가 완료', `${newRestaurant}이(가) 추가되었습니다!`);
                setNewRestaurant('');
                setNewWalkTime('');
                setNewImage('');
                setNewCategory('');
                setNewDescription('');
                setNewWebsiteUrl('');
                setCurrentView('main');
                await loadRestaurants();
            }
        } catch (error) {
            console.error('가게 추가 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteRestaurant = async (id) => {
        try {
            setLoading(true);
            const result = await apiCall(`/api/restaurants/${id}`, { method: 'DELETE' });

            if (result.success) {
                showModal('success', '삭제 완료', '가게가 삭제되었습니다!');
                await loadRestaurants();
            }
        } catch (error) {
            console.error('가게 삭제 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 랜덤 선택 함수
    const selectRandomRestaurant = async () => {
        if (!currentUser) {
            showModal('error', '오류', '사용자 정보가 없습니다.');
            return;
        }

        const availableRestaurants = getFilteredAndSortedRestaurants();
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
            } finally {
                setIsSpinning(false);
            }
        }, 2000);
    };
    // 유틸리티 함수들
    const getAllCategories = () => {
        const categories = [...new Set(restaurants.map(r => r.category))];
        return categories.sort();
    };

    const getFilteredAndSortedRestaurants = () => {
        let filtered = restaurants.filter(restaurant => {
            const matchesCategory = filterCategory === 'all' || restaurant.category === filterCategory;
            const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'distance') {
                return parseInt(a.distance) - parseInt(b.distance);
            }
            return 0;
        });

        return filtered;
    };

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

    // 초기 로딩
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // 저장된 사용자 정보 확인
                const savedUserId = localStorage.getItem('currentUserId');
                const savedUserName = localStorage.getItem('currentUserName');

                if (savedUserId && savedUserName) {
                    // 사용자 정보를 다시 가져와서 최신 권한 확인
                    try {
                        const userResult = await apiCall('/api/users', {
                            method: 'POST',
                            body: JSON.stringify({ name: savedUserName })
                        });

                        if (userResult.success) {
                            setCurrentUser(userResult.data);
                            setUserName(userResult.data.name);
                            setIsUserNameSet(true);
                            setIsAdmin(userResult.data.role === 'admin');
                            await Promise.all([
                                loadUserData(savedUserId),
                                loadUserPreferences()
                            ]);
                        }
                    } catch (error) {
                        // 실패 시 기본 정보로 설정
                        setCurrentUser({ _id: savedUserId, name: savedUserName });
                        setUserName(savedUserName);
                        setIsUserNameSet(true);
                        await loadUserData(savedUserId);
                    }
                }

                await loadRestaurants();
            } finally {
                // 초기화 완료
                setIsInitializing(false);
            }
        };

        initializeApp();
    }, []);

    // 검색어나 정렬 옵션이 변경될 때마다 가게 목록 다시 로드
    useEffect(() => {
        if (restaurants.length > 0 || currentView === 'list') {
            loadRestaurants();
        }
    }, [searchQuery, sortBy, filterCategory]);

    // 방문기록 삭제
    const clearVisitHistory = () => {
        showModal('confirm', '방문기록 삭제', '내 방문기록을 모두 삭제하시겠습니까?', async () => {
            try {
                const result = await apiCall('/api/visits', {
                    method: 'DELETE',
                    body: JSON.stringify({ userId: currentUser._id })
                });

                if (result.success) {
                    setVisitHistory([]);
                    showModal('success', '삭제 완료', `${result.deletedCount}개의 방문기록이 모두 삭제되었습니다!`);
                } else {
                    showModal('error', '삭제 실패', result.message || '방문기록 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('방문기록 삭제 실패:', error);
                showModal('error', '삭제 실패', '방문기록 삭제 중 오류가 발생했습니다.');
            }
        });
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



    // 선호도 핸들러들 (useCallback으로 최적화)
    const handleExcludeRecentChange = useCallback((checked) => {
        updateUserPreferences({
            ...userPreferences?.preferences,
            excludeRecentVisits: checked
        });
    }, [updateUserPreferences, userPreferences?.preferences]);

    const handleRecentDaysChange = useCallback((days) => {
        updateUserPreferences({
            ...userPreferences?.preferences,
            recentVisitDays: days
        });
    }, [updateUserPreferences, userPreferences?.preferences]);

    const closePreferencesModal = useCallback(() => {
        setShowPreferences(false);
        document.body.style.overflow = 'unset';
    }, []);

    // 모달이 열릴 때 body 스크롤 방지
    useEffect(() => {
        if (showPreferences) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [showPreferences]);

    // 선호도 설정 모달 (useMemo로 최적화)
    const PreferencesPanel = useMemo(() => {
        if (!showPreferences) return null;

        return (
            <div className="modal-overlay" onClick={closePreferencesModal}>
                <div className="modal-content large" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>⚙️ 선호도 설정</h3>
                    </div>
                    <div className="modal-body">
                        <div className="preferences-content">
                            {/* 제외된 가게 목록 */}
                            <div className="preference-section">
                                <h4>❌ 제외된 가게 ({userPreferences?.excludedRestaurants?.length || 0}개)</h4>
                                {userPreferences?.excludedRestaurants?.length > 0 ? (
                                    <div className="excluded-list">
                                        {userPreferences.excludedRestaurants.map(excluded => (
                                            <div key={excluded.restaurantId._id} className="excluded-item">
                                                <img
                                                    src={excluded.restaurantId.image}
                                                    alt={excluded.restaurantId.name}
                                                    className="excluded-image"
                                                />
                                                <div className="excluded-info">
                                                    <span className="excluded-name">{excluded.restaurantId.name}</span>
                                                    <span className="excluded-category">{excluded.restaurantId.category}</span>
                                                    <span className="excluded-date">
                                                        {new Date(excluded.excludedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <button
                                                    className="include-btn small"
                                                    onClick={() => toggleRestaurantExclusion(excluded.restaurantId._id, 'include')}
                                                    disabled={loading}
                                                >
                                                    포함
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-excluded">제외된 가게가 없습니다.</p>
                                )}
                            </div>

                            {/* 기타 설정 */}
                            <div className="preference-section">
                                <h4>🔄 랜덤 선택 설정</h4>
                                <div className="preference-options">
                                    <label className="preference-option">
                                        <input
                                            type="checkbox"
                                            checked={userPreferences?.preferences?.excludeRecentVisits || false}
                                            onChange={(e) => handleExcludeRecentChange(e.target.checked)}
                                        />
                                        <span>최근 방문한 가게 제외</span>
                                    </label>

                                    {userPreferences?.preferences?.excludeRecentVisits && (
                                        <div className="sub-option">
                                            <label>
                                                제외 기간:
                                                <select
                                                    value={userPreferences?.preferences?.recentVisitDays || 7}
                                                    onChange={(e) => handleRecentDaysChange(parseInt(e.target.value))}
                                                >
                                                    <option value={1}>1일</option>
                                                    <option value={3}>3일</option>
                                                    <option value={7}>7일</option>
                                                    <option value={14}>14일</option>
                                                    <option value={30}>30일</option>
                                                </select>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="modal-btn confirm"
                            onClick={closePreferencesModal}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [showPreferences, userPreferences, loading, closePreferencesModal, handleExcludeRecentChange, handleRecentDaysChange, toggleRestaurantExclusion]);

    // 가게 수정 핸들러들 (useCallback으로 최적화)
    const handleEditNameChange = useCallback((e) => {
        setEditingRestaurant(prev => prev ? { ...prev, name: e.target.value } : null);
    }, []);

    const handleEditDistanceChange = useCallback((e) => {
        setEditingRestaurant(prev => prev ? { ...prev, distance: e.target.value } : null);
    }, []);

    const handleEditCategoryChange = useCallback((e) => {
        setEditingRestaurant(prev => prev ? { ...prev, category: e.target.value } : null);
    }, []);

    const handleEditImageChange = useCallback((e) => {
        setEditingRestaurant(prev => prev ? { ...prev, image: e.target.value } : null);
    }, []);

    const handleEditDescriptionChange = useCallback((e) => {
        setEditingRestaurant(prev => prev ? { ...prev, description: e.target.value } : null);
    }, []);

    const handleEditSubmit = useCallback(() => {
        if (!editingRestaurant?.name.trim() || !editingRestaurant?.distance.trim() || !editingRestaurant?.category || !editingRestaurant?.image.trim()) {
            showModal('error', '입력 오류', '모든 필수 필드를 입력해주세요.');
            return;
        }
        updateRestaurant(editingRestaurant);
    }, [editingRestaurant, updateRestaurant, showModal]);

    const closeEditModal = useCallback(() => {
        setShowEditRestaurant(false);
        setEditingRestaurant(null);
    }, []);

    // 가게 수정 모달 (useMemo로 최적화)
    const EditRestaurantModal = useMemo(() => {
        if (!showEditRestaurant || !editingRestaurant) return null;

        return (
            <div className="modal-overlay" onClick={closeEditModal}>
                <div className="modal-content large" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>✏️ 가게 정보 수정</h3>
                    </div>
                    <div className="modal-body">
                        <div className="edit-form">
                            <div className="form-group">
                                <label>가게 이름 *</label>
                                <input
                                    type="text"
                                    value={editingRestaurant.name}
                                    onChange={handleEditNameChange}
                                    placeholder="가게 이름을 입력하세요"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>거리 *</label>
                                <input
                                    type="text"
                                    value={editingRestaurant.distance}
                                    onChange={handleEditDistanceChange}
                                    placeholder="예: 50m 또는 2분"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>카테고리 *</label>
                                <select
                                    value={editingRestaurant.category}
                                    onChange={handleEditCategoryChange}
                                    disabled={loading}
                                >
                                    <option value="한식">한식</option>
                                    <option value="중식">중식</option>
                                    <option value="일식">일식</option>
                                    <option value="양식">양식</option>
                                    <option value="분식">분식</option>
                                    <option value="치킨">치킨</option>
                                    <option value="카페">카페</option>
                                    <option value="베트남식">베트남식</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>이미지 URL *</label>
                                <input
                                    type="url"
                                    value={editingRestaurant.image}
                                    onChange={handleEditImageChange}
                                    placeholder="https://example.com/image.jpg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>웹사이트 URL</label>
                                <input
                                    type="url"
                                    value={editingRestaurant.websiteUrl || ''}
                                    onChange={(e) => setEditingRestaurant(prev => prev ? { ...prev, websiteUrl: e.target.value } : null)}
                                    placeholder="https://example.com"
                                    disabled={loading}
                                />
                                <small>가게 홈페이지, 인스타그램, 블로그 등의 링크</small>
                            </div>

                            <div className="form-group">
                                <label>설명</label>
                                <textarea
                                    value={editingRestaurant.description || ''}
                                    onChange={handleEditDescriptionChange}
                                    placeholder="가게에 대한 간단한 설명"
                                    rows="3"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="modal-btn cancel" onClick={closeEditModal}>취소</button>
                        <button
                            className="modal-btn confirm"
                            onClick={handleEditSubmit}
                            disabled={loading || !editingRestaurant.name.trim() || !editingRestaurant.distance.trim() || !editingRestaurant.category || !editingRestaurant.image.trim()}
                        >
                            {loading ? '수정 중...' : '수정 완료'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [showEditRestaurant, editingRestaurant, loading, closeEditModal, handleEditSubmit, handleEditNameChange, handleEditDistanceChange, handleEditCategoryChange, handleEditImageChange, handleEditDescriptionChange]);

    // 초기화 중일 때는 로딩 화면 표시
    if (isInitializing) {
        return (
            <>
                <Head>
                    <title>점심메뉴 선택기</title>
                    <meta name="description" content="로딩 중..." />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="user-setup">
                            <div className="spinner spinning" style={{width: '60px', height: '60px', margin: '0 auto 20px'}}></div>
                            <h1 className="setup-title">로딩 중...</h1>
                            <p className="setup-description">
                                사용자 정보를 확인하고 있습니다
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 사용자 이름 입력 화면
    if (!isUserNameSet) {
        return (
            <>
                <Head>
                    <title>사용자 설정 - 점심메뉴 선택기</title>
                    <meta name="description" content="사용자 이름을 입력하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="user-setup">
                            <div className="setup-icon">👋</div>
                            <h1 className="setup-title">환영합니다!</h1>
                            <p className="setup-description">
                                점심메뉴 선택기를 사용하기 위해<br />
                                사용자 이름을 입력해주세요
                            </p>

                            <div className="setup-form">
                                <div className="input-container">
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => {
                                            setUserName(e.target.value);
                                            setNameCheckStatus('');
                                            setNameCheckMessage('');
                                            setShowAdminPassword(false);
                                            setAdminPassword('');
                                        }}
                                        onBlur={() => userName.trim() && checkUserName(userName)}
                                        placeholder="이름을 입력하세요 (예: 홍길동)"
                                        className={`setup-input ${nameCheckStatus}`}
                                        onKeyPress={(e) => e.key === 'Enter' && setUserNameHandler(userName)}
                                        autoFocus
                                        disabled={loading}
                                        maxLength="20"
                                    />
                                    {nameCheckStatus && (
                                        <div className={`name-check-message ${nameCheckStatus}`}>
                                            {nameCheckStatus === 'checking' && '🔄'}
                                            {nameCheckStatus === 'available' && '✅'}
                                            {nameCheckStatus === 'exists' && '👤'}
                                            {nameCheckStatus === 'invalid' && '❌'}
                                            <span>{nameCheckMessage}</span>
                                        </div>
                                    )}
                                </div>

                                {showAdminPassword && (
                                    <div className="input-container">
                                        <input
                                            type="password"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="관리자 비밀번호 (123)"
                                            className="setup-input"
                                            onKeyPress={(e) => e.key === 'Enter' && setUserNameHandler(userName)}
                                            disabled={loading}
                                        />
                                    </div>
                                )}

                                <button
                                    className="setup-btn"
                                    onClick={() => setUserNameHandler(userName)}
                                    disabled={!userName.trim() || loading || (nameCheckStatus === 'invalid') || (showAdminPassword && !adminPassword.trim())}
                                >
                                    {loading ? '처리 중...' :
                                        nameCheckStatus === 'checking' ? '확인 중...' :
                                            userName.trim() === '관리자' ? '관리자로 로그인' :
                                                nameCheckStatus === 'exists' ? '기존 사용자로 로그인' : '새 사용자로 시작하기'}
                                </button>
                            </div>

                            <div className="setup-info">
                                <p>💡 개인 방문기록이 따로 저장됩니다</p>
                                <p>🤝 가게 목록은 모든 사용자가 공유합니다</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    // 가게 상세 화면
    if (currentView === 'detail' && selectedRestaurantDetail) {
        return (
            <>
                <Head>
                    <title>{selectedRestaurantDetail.name} - 점심메뉴 선택기</title>
                    <meta name="description" content={`${selectedRestaurantDetail.name} 상세 정보`} />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="header">
                            <h1 className="title">🍽️ 가게 상세</h1>
                            <button className="home-btn" onClick={() => setCurrentView('list')}>
                                <span className="home-icon">📋</span>
                                목록으로
                            </button>
                        </div>

                        <div className="restaurant-detail">
                            <div className="detail-image-container">
                                <img
                                    src={selectedRestaurantDetail.image}
                                    alt={selectedRestaurantDetail.name}
                                    className="detail-image"
                                />
                            </div>
                            <div className="detail-info">
                                <h2 className="detail-name">{selectedRestaurantDetail.name}</h2>
                                <div className="detail-meta">
                                    <span className="detail-category">{selectedRestaurantDetail.category}</span>
                                    <span className="detail-distance">🚶‍♂️ {selectedRestaurantDetail.distance}</span>
                                    {selectedRestaurantDetail.averageRating > 0 && (
                                        <span className="detail-rating">
                                            ⭐ {selectedRestaurantDetail.averageRating} ({selectedRestaurantDetail.reviewCount}개 리뷰)
                                        </span>
                                    )}
                                </div>
                                {selectedRestaurantDetail.description && (
                                    <p className="detail-description">{selectedRestaurantDetail.description}</p>
                                )}

                                {/* 웹사이트 링크 */}
                                {selectedRestaurantDetail.websiteUrl && (
                                    <div className="detail-website">
                                        <a 
                                            href={selectedRestaurantDetail.websiteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="website-link"
                                        >
                                            🔗 웹사이트 바로가기
                                        </a>
                                    </div>
                                )}

                                {/* 빠른 액션 버튼들 */}
                                <div className="detail-actions">
                                    <button
                                        className="action-btn primary"
                                        onClick={() => window.location.href = `/reviews?restaurant=${selectedRestaurantDetail._id}`}
                                    >
                                        📝 리뷰 작성
                                    </button>
                                    <button
                                        className="action-btn secondary"
                                        onClick={() => {
                                            setEditingRestaurant({ ...selectedRestaurantDetail });
                                            setShowEditRestaurant(true);
                                        }}
                                    >
                                        ✏️ 가게 정보 수정
                                    </button>

                                    {isAdmin && (
                                        <button
                                            className="action-btn danger"
                                            onClick={() => showModal('confirm', '가게 삭제', `${selectedRestaurantDetail.name}을(를) 완전히 삭제하시겠습니까?\\n관리자만 가게를 삭제할 수 있습니다.`, async () => {
                                                await deleteRestaurant(selectedRestaurantDetail._id);
                                                setCurrentView('main');
                                            })}
                                            disabled={loading}
                                        >
                                            🗑️ 가게 삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 리뷰 섹션 */}
                        <div className="detail-reviews">
                            <div className="reviews-header">
                                <h3>📝 리뷰 ({reviews.length})</h3>
                                <button
                                    className="refresh-btn"
                                    onClick={() => loadReviews(selectedRestaurantDetail._id)}
                                >
                                    🔄 새로고침
                                </button>
                            </div>

                            {reviews.length === 0 ? (
                                <div className="no-reviews">
                                    <p>아직 리뷰가 없습니다.</p>
                                    <p>첫 번째 리뷰를 작성해보세요! ✍️</p>
                                </div>
                            ) : (
                                <div className="reviews-preview">
                                    {reviews.slice(0, 3).map(review => (
                                        <div key={review._id} className="review-preview-item">
                                            <div className="review-preview-header">
                                                <strong>{review.userName}</strong>
                                                <div className="review-preview-rating">
                                                    {'⭐'.repeat(review.rating)}
                                                </div>
                                            </div>
                                            <p className="review-preview-content">{review.content}</p>
                                            <div className="review-preview-footer">
                                                <span className="review-preview-date">
                                                    {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                                                </span>
                                                <div className="review-actions">
                                                    <button
                                                        className={`preview-like-btn ${review.likes?.some(like => like.userId === currentUser?._id) ? 'liked' : ''}`}
                                                        onClick={() => toggleReviewLike(review._id)}
                                                    >
                                                        👍 {review.likeCount || 0}
                                                    </button>
                                                    
                                                    {/* 본인 리뷰인 경우 수정/삭제 버튼 */}
                                                    {review.userId === currentUser?._id && (
                                                        <>
                                                            <button
                                                                className="preview-edit-btn"
                                                                onClick={() => window.location.href = '/reviews'}
                                                                title="리뷰 페이지에서 수정"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="preview-delete-btn own"
                                                                onClick={() => showModal('confirm', '내 리뷰 삭제', '내 리뷰를 삭제하시겠습니까?', () => deleteReview(review._id, true))}
                                                                disabled={loading}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                    {/* 관리자인 경우 타인 리뷰 삭제 버튼 */}
                                                    {isAdmin && review.userId !== currentUser?._id && (
                                                        <button
                                                            className="preview-delete-btn admin"
                                                            onClick={() => showModal('confirm', '리뷰 삭제', `${review.userName}님의 리뷰를 삭제하시겠습니까?`, () => deleteReview(review._id))}
                                                            disabled={loading}
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {reviews.length > 3 && (
                                        <div className="more-reviews">
                                            <button
                                                className="more-reviews-btn"
                                                onClick={() => window.location.href = `/reviews?restaurant=${selectedRestaurantDetail._id}`}
                                            >
                                                더 많은 리뷰 보기 ({reviews.length - 3}개 더)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="detail-stats">
                            <span>생성일: {new Date(selectedRestaurantDetail.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <Modal />
                {EditRestaurantModal}
            </>
        );
    }

    // 가게 추가 화면
    if (currentView === 'add') {
        return (
            <>
                <Head>
                    <title>가게 추가 - 점심메뉴 선택기</title>
                    <meta name="description" content="새로운 점심 가게를 추가하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="header">
                            <h1 className="title">🏪 가게 추가</h1>
                            <button className="home-btn" onClick={() => setCurrentView('main')}>
                                <span className="home-icon">🏠</span>
                                메인으로
                            </button>
                        </div>

                        <div className="add-form">
                            <div className="form-group">
                                <label>가게 이름</label>
                                <input
                                    type="text"
                                    value={newRestaurant}
                                    onChange={(e) => setNewRestaurant(e.target.value)}
                                    placeholder="예: 김밥천국"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>거리</label>
                                <input
                                    type="text"
                                    value={newWalkTime}
                                    onChange={(e) => setNewWalkTime(e.target.value)}
                                    placeholder="예: 50m 또는 2분"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>카테고리</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">카테고리 선택</option>
                                    <option value="한식">한식</option>
                                    <option value="중식">중식</option>
                                    <option value="일식">일식</option>
                                    <option value="양식">양식</option>
                                    <option value="분식">분식</option>
                                    <option value="치킨">치킨</option>
                                    <option value="카페">카페</option>
                                    <option value="베트남식">베트남식</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>이미지 URL</label>
                                <input
                                    type="url"
                                    value={newImage}
                                    onChange={(e) => setNewImage(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>웹사이트 URL (선택사항)</label>
                                <input
                                    type="url"
                                    value={newWebsiteUrl}
                                    onChange={(e) => setNewWebsiteUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    disabled={loading}
                                />
                                <small>가게 홈페이지, 인스타그램, 블로그 등의 링크</small>
                            </div>

                            <div className="form-group">
                                <label>설명 (선택사항)</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="가게에 대한 간단한 설명"
                                    rows="3"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    className="add-btn"
                                    onClick={addRestaurant}
                                    disabled={loading || !newRestaurant.trim() || !newWalkTime.trim() || !newCategory || !newImage.trim()}
                                >
                                    {loading ? '추가 중...' : '가게 추가'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    // 가게 목록 화면
    if (currentView === 'list') {
        const filteredRestaurants = getFilteredAndSortedRestaurants();
        const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedRestaurants = filteredRestaurants.slice(startIndex, startIndex + itemsPerPage);

        return (
            <>
                <Head>
                    <title>가게 목록 - 점심메뉴 선택기</title>
                    <meta name="description" content="등록된 점심 가게 목록을 확인하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="header">
                            <h1 className="title">📋 가게 목록</h1>
                            <button className="home-btn" onClick={() => setCurrentView('main')}>
                                <span className="home-icon">🏠</span>
                                메인으로
                            </button>
                        </div>

                        {/* 검색 및 필터 */}
                        <div className="filters">
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="가게 이름 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="filter-controls">
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="all">전체 카테고리</option>
                                    {getAllCategories().map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="name">이름순</option>
                                    <option value="distance">거리순</option>
                                    <option value="newest">최신순</option>
                                </select>
                            </div>
                        </div>

                        {/* 가게 목록 */}
                        <div className="restaurant-list">
                            {paginatedRestaurants.length === 0 ? (
                                <div className="empty-state">
                                    <p>조건에 맞는 가게가 없습니다.</p>
                                    {restaurants.length === 0 && (
                                        <button
                                            className="sample-btn"
                                            onClick={initializeSampleData}
                                            disabled={loading}
                                        >
                                            {loading ? '생성 중...' : '샘플 데이터 생성'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                paginatedRestaurants.map(restaurant => (
                                    <div key={restaurant._id} className="restaurant-item">
                                        <img
                                            src={restaurant.image}
                                            alt={restaurant.name}
                                            className="restaurant-image"
                                        />
                                        <div className="restaurant-info">
                                            <h3 className="restaurant-name">{restaurant.name}</h3>
                                            <div className="restaurant-meta">
                                                <span className="restaurant-category">{restaurant.category}</span>
                                                <span className="restaurant-distance">🚶‍♂️ {restaurant.distance}</span>
                                                {restaurant.averageRating > 0 && (
                                                    <span className="restaurant-rating">
                                                        ⭐ {restaurant.averageRating} ({restaurant.reviewCount})
                                                    </span>
                                                )}
                                            </div>
                                            {restaurant.description && (
                                                <p className="restaurant-description">{restaurant.description}</p>
                                            )}
                                            {restaurant.websiteUrl && (
                                                <div className="restaurant-website">
                                                    <a 
                                                        href={restaurant.websiteUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="restaurant-link"
                                                    >
                                                        🔗 웹사이트
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div className="restaurant-actions">
                                            <button
                                                className="detail-btn"
                                                onClick={async () => {
                                                    setSelectedRestaurantDetail(restaurant);
                                                    setCurrentView('detail');
                                                    await loadReviews(restaurant._id);
                                                }}
                                            >
                                                상세
                                            </button>

                                            {isAdmin ? (
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => showModal('confirm', '가게 삭제', `${restaurant.name}을(를) 삭제하시겠습니까?\\n관리자만 가게를 삭제할 수 있습니다.`, () => deleteRestaurant(restaurant._id))}
                                                    disabled={loading}
                                                >
                                                    🗑️ 삭제
                                                </button>
                                            ) : (
                                                <>
                                                    {userPreferences?.excludedRestaurants?.some(excluded => excluded.restaurantId._id === restaurant._id) ? (
                                                        <button
                                                            className="include-btn"
                                                            onClick={() => toggleRestaurantExclusion(restaurant._id, 'include')}
                                                            disabled={loading}
                                                        >
                                                            ✅ 포함
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="exclude-btn"
                                                            onClick={() => showModal('confirm', '가게 제외', `${restaurant.name}을(를) 랜덤 선택에서 제외하시겠습니까?`, () => toggleRestaurantExclusion(restaurant._id, 'exclude', '사용자 선택'))}
                                                            disabled={loading}
                                                        >
                                                            ❌ 제외
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    이전
                                </button>
                                <span>{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <Modal />
            </>
        );
    }
    // 방문기록 화면
    if (currentView === 'history') {
        return (
            <>
                <Head>
                    <title>방문기록 - 점심메뉴 선택기</title>
                    <meta name="description" content="나의 점심 가게 방문 기록을 확인하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="header">
                            <h1 className="title">📊 {userName}님의 방문기록</h1>
                            <button className="home-btn" onClick={() => setCurrentView('main')}>
                                <span className="home-icon">🏠</span>
                                메인으로
                            </button>
                        </div>

                        {/* 최근 공유 선택 */}
                        {recentSelections.length > 0 && (
                            <div className="recent-selections">
                                <h3>🌟 최근 모든 선택</h3>
                                <div className="recent-list">
                                    {recentSelections.slice(0, 5).map(selection => (
                                        <div key={selection._id} className="recent-item">
                                            <img src={selection.restaurantImage} alt={selection.restaurantName} className="recent-image" />
                                            <div className="recent-info">
                                                <span className="recent-restaurant">{selection.restaurantName}</span>
                                                <span className="recent-user">by {selection.userName}</span>
                                                <span className="recent-time">{new Date(selection.selectedAt).toLocaleString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 간단한 통계 */}
                        <div className="stats-section">
                            <div className="stat-item">
                                <span className="stat-number">{restaurants.length}</span>
                                <span className="stat-label">총 가게 수</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{getAllCategories().length}</span>
                                <span className="stat-label">카테고리 수</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{visitHistory.length}</span>
                                <span className="stat-label">내 방문 횟수</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{recentSelections.length}</span>
                                <span className="stat-label">전체 선택 횟수</span>
                            </div>
                        </div>

                        {/* 개인 방문 기록 */}
                        <div className="history-section">
                            <div className="history-header">
                                <h3>📈 내 방문 기록</h3>
                                {visitHistory.length > 0 && (
                                    <button className="clear-btn" onClick={clearVisitHistory}>
                                        기록 삭제
                                    </button>
                                )}
                            </div>

                            {visitHistory.length === 0 ? (
                                <div className="empty-history">
                                    <p>아직 방문 기록이 없습니다.</p>
                                    <p>랜덤 선택을 해보세요! 🎲</p>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {visitHistory.map(visit => (
                                        <div key={visit._id} className="history-item">
                                            {visit.restaurantId && (
                                                <img
                                                    src={visit.restaurantId.image}
                                                    alt={visit.restaurantName}
                                                    className="history-image"
                                                />
                                            )}
                                            <div className="history-info">
                                                <span className="history-restaurant">{visit.restaurantName}</span>
                                                <span className="history-time">
                                                    {new Date(visit.visitedAt).toLocaleString('ko-KR')}
                                                </span>
                                                <span className="history-type">
                                                    {visit.visitType === 'random' ? '🎲 랜덤 선택' : '👆 직접 선택'}
                                                </span>
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

    // 메인 화면
    return (
        <>
            <Head>
                <title>점심메뉴 선택기</title>
                <meta name="description" content="회사 점심 가게를 랜덤으로 선택해주는 앱" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="App">
                <div className="container">
                    <div className="user-header">
                        <div className="user-info">
                            <span className="user-greeting">안녕하세요, <strong>{userName}</strong>님! 👋</span>
                            <button className="change-user-btn" onClick={changeUserName}>
                                사용자 변경
                            </button>
                        </div>
                    </div>

                    <h1 className="title">🍽️ 점심메뉴 선택기</h1>

                    {/* 최근 선택 정보 */}
                    {recentSelections.length > 0 && recentSelections[0] && (
                        <div className="last-selection-info">
                            <div className="last-selection-content">
                                <span className="last-selection-text">
                                    🕐 마지막 선택: <strong>{recentSelections[0].userName}</strong>님이
                                    <strong>{recentSelections[0].restaurantName}</strong>을(를) 선택
                                    ({new Date(recentSelections[0].selectedAt).toLocaleString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })})
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 필터 섹션 */}
                    <div className="filter-section">
                        <h3>🔍 필터 설정</h3>
                        <div className="filter-controls">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">전체 카테고리</option>
                                {getAllCategories().map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                        <p className="filter-info">
                            {filterCategory === 'all'
                                ? `전체 ${restaurants.length}개 가게`
                                : `${filterCategory} ${getFilteredAndSortedRestaurants().length}개 가게`
                            }
                        </p>
                    </div>

                    {/* 랜덤 선택 섹션 */}
                    <div className="random-section">
                        <div className={`spinner ${isSpinning ? 'spinning' : ''}`}>
                            {selectedRestaurant ? (
                                <div className="selected-restaurant">
                                    <img src={selectedRestaurant.image} alt={selectedRestaurant.name} />
                                    <h3>{selectedRestaurant.name}</h3>
                                    <p>{selectedRestaurant.category} • {selectedRestaurant.distance}</p>
                                </div>
                            ) : (
                                <div className="spinner-placeholder">
                                    <span className="spinner-icon">🍽️</span>
                                    <p>{isSpinning ? '선택 중...' : '랜덤으로 가게를 선택해보세요!'}</p>
                                </div>
                            )}
                        </div>

                        <div className="random-buttons">
                            <button
                                className="random-btn"
                                onClick={selectRandomRestaurant}
                                disabled={isSpinning || loading || restaurants.length === 0}
                            >
                                {isSpinning ? '선택 중...' : '🎲 랜덤으로 가게 선택하기'}
                            </button>
                            
                            <button
                                className="worldcup-btn"
                                onClick={() => window.location.href = '/worldcup'}
                                disabled={loading || restaurants.length < 2}
                            >
                                🏆 점식 식당 월드컵
                            </button>
                        </div>
                    </div>

                    {/* 메뉴 버튼들 */}
                    <div className="menu-buttons">
                        <button className="menu-btn" onClick={() => setCurrentView('list')}>
                            📋 가게 목록 ({restaurants.length})
                        </button>
                        <button className="menu-btn" onClick={() => setCurrentView('add')}>
                            ➕ 가게 추가
                        </button>
                        <button className="menu-btn" onClick={() => setCurrentView('history')}>
                            📊 방문기록 ({visitHistory.length})
                        </button>
                        <button className="menu-btn" onClick={() => window.location.href = '/reviews'}>
                            📝 리뷰 작성
                        </button>
                        <button className="menu-btn" onClick={() => window.location.href = '/feedback'}>
                            💭 피드백 & 기능 요청
                        </button>
                        <button className="menu-btn" onClick={() => setShowPreferences(true)}>
                            ⚙️ 선호도 설정
                        </button>
                        {isAdmin && (
                            <button className="menu-btn admin-active">
                                👑 관리자 모드
                            </button>
                        )}
                    </div>

                    {/* 초기화 버튼 (가게가 없을 때만) */}
                    {restaurants.length === 0 && (
                        <div className="init-section">
                            <p>등록된 가게가 없습니다.</p>
                            <button
                                className="sample-btn"
                                onClick={initializeSampleData}
                                disabled={loading}
                            >
                                {loading ? '생성 중...' : '샘플 데이터 생성'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <Modal />
            {PreferencesPanel}
            {EditRestaurantModal}
        </>
    );
}