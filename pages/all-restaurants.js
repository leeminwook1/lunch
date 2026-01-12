import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ErrorBoundary from '../components/ErrorBoundary';
import RestaurantCard from '../components/RestaurantCard';
import { RestaurantListSkeleton } from '../components/SkeletonLoader';
import { useUser } from '../hooks/useUser';
import { useRestaurants } from '../hooks/useRestaurants';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';

export default function AllRestaurants() {
    const router = useRouter();
    const { currentUser, isAdmin, isUserNameSet, isInitializing } = useUser();
    const {
        restaurants,
        categories,
        loading: restaurantsLoading,
        loadRestaurants
    } = useRestaurants();

    const { modal, showModal, closeModal, confirmModal } = useModal();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name');

    // 사용자 로그인 체크
    useEffect(() => {
        if (!isInitializing && !isUserNameSet) {
            router.push('/');
        }
    }, [isInitializing, isUserNameSet, router]);

    // 필터링 및 정렬
    const filteredRestaurants = restaurants.filter(restaurant => {
        const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;
        const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name, 'ko');
            case 'distance':
                const distA = parseInt(a.distance) || 999;
                const distB = parseInt(b.distance) || 999;
                return distA - distB;
            case 'rating':
                return (b.averageRating || 0) - (a.averageRating || 0);
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            default:
                return 0;
        }
    });

    // 카테고리별 그룹화 (검색 필터 적용 전 전체 데이터 기준)
    const restaurantsByCategory = categories.reduce((acc, category) => {
        acc[category] = restaurants.filter(r => {
            const matchesCategory = r.category === category;
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        }).sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, 'ko');
                case 'distance':
                    const distA = parseInt(a.distance) || 999;
                    const distB = parseInt(b.distance) || 999;
                    return distA - distB;
                case 'rating':
                    return (b.averageRating || 0) - (a.averageRating || 0);
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });
        return acc;
    }, {});

    const viewRestaurantDetail = (restaurant) => {
        router.push(`/?restaurantId=${restaurant._id}`);
    };

    const deleteRestaurant = async (id, name) => {
        showModal('confirm', '가게 삭제', `${name}을(를) 삭제하시겠습니까?`, async () => {
            try {
                const response = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
                const result = await response.json();

                if (result.success) {
                    showModal('success', '삭제 완료', '가게가 삭제되었습니다!');
                    await loadRestaurants();
                }
            } catch (error) {
                console.error('가게 삭제 실패:', error);
            }
        });
    };

    // 로딩 중이면 스켈레톤 표시
    if (isInitializing) {
        return (
            <div className="all-restaurants-page">
                <div className="all-restaurants-container">
                    <RestaurantListSkeleton count={12} />
                </div>
            </div>
        );
    }

    // 로그인하지 않은 경우
    if (!isUserNameSet) {
        return null;
    }

    return (
        <ErrorBoundary>
            <Head>
                <title>전체 가게 목록 - 점심메뉴 선택기</title>
                <meta name="description" content="모든 가게를 카테고리별로 한눈에 확인하세요" />
            </Head>

            <div className="all-restaurants-page">
                <div className="all-restaurants-container">
                    {/* 헤더 */}
                    <header className="all-restaurants-header">
                        <button onClick={() => router.push('/')} className="btn-back-home">
                            ← 메인으로
                        </button>
                        <h1 className="all-restaurants-title">🏪 전체 가게 목록</h1>
                        <div className="header-stats">
                            <span className="total-count">총 {restaurants.length}개</span>
                        </div>
                    </header>

                    {/* 검색 및 정렬 */}
                    <div className="all-restaurants-controls">
                        <div className="search-box-large">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="가게 이름 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input-large"
                            />
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select-large"
                        >
                            <option value="name">이름순</option>
                            <option value="distance">거리순</option>
                            <option value="rating">평점순</option>
                            <option value="newest">최신순</option>
                        </select>
                    </div>

                    {/* 카테고리 탭 */}
                    <div className="category-tabs">
                        <button
                            className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            전체 ({restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).length})
                        </button>
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category} ({restaurantsByCategory[category]?.length || 0})
                            </button>
                        ))}
                    </div>

                    {/* 가게 목록 */}
                    <div className="all-restaurants-content">
                        {restaurantsLoading ? (
                            <RestaurantListSkeleton count={12} />
                        ) : selectedCategory === 'all' ? (
                            // 전체 보기 - 카테고리별로 그룹화
                            categories.map(category => {
                                const categoryRestaurants = restaurantsByCategory[category];
                                if (!categoryRestaurants || categoryRestaurants.length === 0) return null;

                                return (
                                    <div key={category} className="category-section">
                                        <div className="category-section-header">
                                            <h2>{category}</h2>
                                            <span className="category-count">{categoryRestaurants.length}개</span>
                                        </div>
                                        <div className="restaurants-grid-large">
                                            {categoryRestaurants.map(restaurant => (
                                                <RestaurantCard
                                                    key={restaurant._id}
                                                    restaurant={restaurant}
                                                    onViewDetail={viewRestaurantDetail}
                                                    isAdmin={isAdmin}
                                                    currentUser={currentUser}
                                                    onEdit={(restaurant) => {
                                                        router.push(`/?edit=${restaurant._id}`);
                                                    }}
                                                    onDelete={deleteRestaurant}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            // 특정 카테고리 보기
                            <div className="category-section">
                                <div className="restaurants-grid-large">
                                    {sortedRestaurants.map(restaurant => (
                                        <RestaurantCard
                                            key={restaurant._id}
                                            restaurant={restaurant}
                                            onViewDetail={viewRestaurantDetail}
                                            isAdmin={isAdmin}
                                            currentUser={currentUser}
                                            onEdit={(restaurant) => {
                                                router.push(`/?edit=${restaurant._id}`);
                                            }}
                                            onDelete={deleteRestaurant}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {sortedRestaurants.length === 0 && !restaurantsLoading && (
                            <div className="empty-state-large">
                                <div className="empty-icon">🔍</div>
                                <h3>검색 결과가 없습니다</h3>
                                <p>다른 검색어를 시도해보세요</p>
                            </div>
                        )}
                    </div>
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
