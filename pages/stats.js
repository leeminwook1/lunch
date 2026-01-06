import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '../hooks/useUser';
import styles from '../styles/Stats.module.css';

export default function StatsPage() {
    const router = useRouter();
    const { currentUser, apiCall } = useUser();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('overview'); // overview, personal, popular

    useEffect(() => {
        if (currentUser) {
            loadStats();
        }
    }, [currentUser]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const result = await apiCall(`/api/stats?userId=${currentUser._id}`);
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('통계 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>로그인이 필요합니다</h2>
                    <button onClick={() => router.push('/')} className={styles.btnPrimary}>
                        홈으로 가기
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>통계를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    const { overview, categoryStats, popularRestaurants, userStats } = stats || {};

    return (
        <>
            <Head>
                <title>통계 대시보드 - 점심메뉴 선택기</title>
                <meta name="description" content="점심 선택 통계 대시보드" />
            </Head>

            <div className={styles.container}>
                <div className={styles.header}>
                    <button onClick={() => router.push('/')} className={styles.btnBack}>
                        ← 뒤로가기
                    </button>
                    <h1 className={styles.title}>📊 통계 대시보드</h1>
                    <div className={styles.userInfo}>
                        <span>{currentUser.name}님</span>
                    </div>
                </div>

                {/* 뷰 모드 선택 */}
                <div className={styles.viewModeSelector}>
                    <button
                        className={`${styles.viewModeBtn} ${viewMode === 'overview' ? styles.active : ''}`}
                        onClick={() => setViewMode('overview')}
                    >
                        🌐 전체 통계
                    </button>
                    <button
                        className={`${styles.viewModeBtn} ${viewMode === 'personal' ? styles.active : ''}`}
                        onClick={() => setViewMode('personal')}
                    >
                        👤 내 통계
                    </button>
                    <button
                        className={`${styles.viewModeBtn} ${viewMode === 'popular' ? styles.active : ''}`}
                        onClick={() => setViewMode('popular')}
                    >
                        🔥 인기 순위
                    </button>
                </div>

                {/* 전체 통계 */}
                {viewMode === 'overview' && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>📈 전체 현황</h2>
                            <div className={styles.overviewGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🏪</div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statNumber}>{overview?.totalRestaurants || 0}</div>
                                        <div className={styles.statLabel}>등록된 가게</div>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>👥</div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statNumber}>{overview?.totalUsers || 0}</div>
                                        <div className={styles.statLabel}>전체 사용자</div>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🍽️</div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statNumber}>{overview?.totalVisits || 0}</div>
                                        <div className={styles.statLabel}>총 방문 횟수</div>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🎲</div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statNumber}>{overview?.totalSelections || 0}</div>
                                        <div className={styles.statLabel}>랜덤 선택 횟수</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>🍜 카테고리별 분포</h2>
                            <div className={styles.chartContainer}>
                                {categoryStats && categoryStats.length > 0 ? (
                                    <div className={styles.barChart}>
                                        {categoryStats.map((item, index) => {
                                            const maxCount = Math.max(...categoryStats.map(c => c.count));
                                            const percentage = (item.count / maxCount) * 100;
                                            return (
                                                <div key={index} className={styles.barItem}>
                                                    <div className={styles.barLabel}>{item._id}</div>
                                                    <div className={styles.barWrapper}>
                                                        <div
                                                            className={styles.barFill}
                                                            style={{ width: `${percentage}%` }}
                                                        >
                                                            <span className={styles.barValue}>{item.count}개</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>데이터가 없습니다</div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* 개인 통계 */}
                {viewMode === 'personal' && userStats && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>👤 {userStats.userName}님의 통계</h2>
                            <div className={styles.personalStats}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🍽️</div>
                                    <div className={styles.statContent}>
                                        <div className={styles.statNumber}>{userStats.totalVisits}</div>
                                        <div className={styles.statLabel}>총 방문 횟수</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>📊 내가 선호하는 카테고리</h2>
                            <div className={styles.chartContainer}>
                                {userStats.visitsByCategory && userStats.visitsByCategory.length > 0 ? (
                                    <div className={styles.barChart}>
                                        {userStats.visitsByCategory.map((item, index) => {
                                            const maxCount = Math.max(...userStats.visitsByCategory.map(c => c.count));
                                            const percentage = (item.count / maxCount) * 100;
                                            return (
                                                <div key={index} className={styles.barItem}>
                                                    <div className={styles.barLabel}>{item._id}</div>
                                                    <div className={styles.barWrapper}>
                                                        <div
                                                            className={styles.barFill}
                                                            style={{ width: `${percentage}%` }}
                                                        >
                                                            <span className={styles.barValue}>{item.count}회</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>아직 방문 기록이 없습니다</div>
                                )}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>⭐ 내가 자주 가는 가게 TOP 5</h2>
                            <div className={styles.rankingList}>
                                {userStats.mostVisitedRestaurants && userStats.mostVisitedRestaurants.length > 0 ? (
                                    userStats.mostVisitedRestaurants.map((item, index) => (
                                        <div key={index} className={styles.rankingItem}>
                                            <div className={styles.rankBadge}>#{index + 1}</div>
                                            <div className={styles.restaurantImage}>
                                                <img src={item.restaurant.image} alt={item.restaurant.name} />
                                            </div>
                                            <div className={styles.restaurantInfo}>
                                                <div className={styles.restaurantName}>{item.restaurant.name}</div>
                                                <div className={styles.restaurantCategory}>{item.restaurant.category}</div>
                                            </div>
                                            <div className={styles.visitCount}>
                                                <span className={styles.countNumber}>{item.visitCount}</span>
                                                <span className={styles.countLabel}>회 방문</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>아직 방문 기록이 없습니다</div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* 인기 순위 */}
                {viewMode === 'popular' && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>🔥 전체 인기 가게 TOP 10</h2>
                            <div className={styles.rankingList}>
                                {popularRestaurants && popularRestaurants.length > 0 ? (
                                    popularRestaurants.map((item, index) => (
                                        <div key={index} className={styles.rankingItem}>
                                            <div className={`${styles.rankBadge} ${index < 3 ? styles.topThree : ''}`}>
                                                {index === 0 && '🥇'}
                                                {index === 1 && '🥈'}
                                                {index === 2 && '🥉'}
                                                {index > 2 && `#${index + 1}`}
                                            </div>
                                            <div className={styles.restaurantImage}>
                                                <img src={item.restaurant.image} alt={item.restaurant.name} />
                                            </div>
                                            <div className={styles.restaurantInfo}>
                                                <div className={styles.restaurantName}>{item.restaurant.name}</div>
                                                <div className={styles.restaurantCategory}>{item.restaurant.category}</div>
                                            </div>
                                            <div className={styles.visitCount}>
                                                <span className={styles.countNumber}>{item.visitCount}</span>
                                                <span className={styles.countLabel}>회 방문</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>데이터가 없습니다</div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </>
    );
}
