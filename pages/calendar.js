import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Calendar() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 달력 상태
    const [currentDate, setCurrentDate] = useState(new Date());
    const [visitData, setVisitData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedVisits, setSelectedVisits] = useState([]);

    // 방문 추가 모달 상태
    const [showAddVisit, setShowAddVisit] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [newVisit, setNewVisit] = useState({
        restaurantId: '',
        visitDate: '',
        memo: '',
        rating: 5
    });

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
                    await loadVisitData(savedUserId);
                } else {
                    router.push('/');
                    return;
                }

                // 가게 목록 로딩
                const restaurantsResult = await apiCall('/api/restaurants');
                if (restaurantsResult.success) {
                    setRestaurants(restaurantsResult.data);
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 방문 데이터 로딩
    const loadVisitData = async (userId) => {
        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const result = await apiCall(`/api/calendar?userId=${userId}&year=${year}&month=${month}`);
            if (result.success) {
                setVisitData(result.data);
            }
        } catch (error) {
            console.error('방문 데이터 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 월 변경
    const changeMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // 월 변경 시 데이터 다시 로딩
    useEffect(() => {
        if (currentUser) {
            loadVisitData(currentUser._id);
        }
    }, [currentDate, currentUser]);

    // 방문 추가
    const addVisit = async () => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        if (!newVisit.restaurantId || !newVisit.visitDate) {
            showModal('error', '입력 오류', '가게와 날짜를 선택해주세요.');
            return;
        }

        try {
            setLoading(true);
            const selectedRestaurant = restaurants.find(r => r._id === newVisit.restaurantId);

            const result = await apiCall('/api/calendar', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    restaurantId: newVisit.restaurantId,
                    restaurantName: selectedRestaurant.name,
                    restaurantCategory: selectedRestaurant.category,
                    restaurantImage: selectedRestaurant.image,
                    visitDate: newVisit.visitDate,
                    memo: newVisit.memo.trim(),
                    rating: newVisit.rating,
                    visitType: 'manual'
                })
            });

            if (result.success) {
                showModal('success', '방문 기록 추가', '방문 기록이 추가되었습니다!');
                setShowAddVisit(false);
                setNewVisit({
                    restaurantId: '',
                    visitDate: '',
                    memo: '',
                    rating: 5
                });
                await loadVisitData(currentUser._id);
            }
        } catch (error) {
            console.error('방문 기록 추가 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 방문 기록 삭제
    const deleteVisit = async (visitId) => {
        showModal('confirm', '방문 기록 삭제', '이 방문 기록을 삭제하시겠습니까?', async () => {
            try {
                setLoading(true);
                const result = await apiCall(`/api/calendar/${visitId}`, {
                    method: 'DELETE'
                });

                if (result.success) {
                    showModal('success', '삭제 완료', '방문 기록이 삭제되었습니다!');
                    await loadVisitData(currentUser._id);
                    setSelectedVisits([]);
                    setSelectedDate(null);
                }
            } catch (error) {
                console.error('방문 기록 삭제 실패:', error);
            } finally {
                setLoading(false);
            }
        });
    };

    // 로컬 시간대 기준 오늘 날짜 가져오기
    const getTodayLocal = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 달력 생성
    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const calendar = [];
        const current = new Date(startDate);
        const todayLocal = getTodayLocal();

        for (let week = 0; week < 6; week++) {
            const weekDays = [];
            for (let day = 0; day < 7; day++) {
                // 로컬 시간 기준으로 날짜 문자열 생성
                const year = current.getFullYear();
                const month_num = String(current.getMonth() + 1).padStart(2, '0');
                const day_num = String(current.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month_num}-${day_num}`;
                const dayVisits = visitData.filter(visit =>
                    visit.visitDate.split('T')[0] === dateStr
                );

                weekDays.push({
                    date: new Date(current),
                    dateStr,
                    isCurrentMonth: current.getMonth() === month,
                    isToday: dateStr === todayLocal,
                    visits: dayVisits
                });

                current.setDate(current.getDate() + 1);
            }
            calendar.push(weekDays);
        }

        return calendar;
    };

    // 날짜 클릭 핸들러
    const handleDateClick = (day) => {
        if (day.visits.length > 0) {
            setSelectedDate(day.dateStr);
            setSelectedVisits(day.visits);
        } else {
            setSelectedDate(null);
            setSelectedVisits([]);
        }
    };

    const calendar = generateCalendar();
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

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
                <title>방문 달력 - 점심메뉴 선택기</title>
                <meta name="description" content="나의 가게 방문 기록을 달력으로 확인하세요!" />
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
                                <h1 className="title">📅 방문 달력</h1>
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
                        {/* 달력 섹션 */}
                        <section className="calendar-section">
                            <div className="calendar-header">
                                <button
                                    onClick={() => changeMonth(-1)}
                                    className="month-nav-btn"
                                >
                                    ← 이전
                                </button>
                                <h2 className="current-month">
                                    {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
                                </h2>
                                <button
                                    onClick={() => changeMonth(1)}
                                    className="month-nav-btn"
                                >
                                    다음 →
                                </button>
                            </div>

                            <div className="calendar-grid">
                                {/* 요일 헤더 */}
                                <div className="calendar-days-header">
                                    {dayNames.map(day => (
                                        <div key={day} className="day-header">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* 달력 본체 */}
                                <div className="calendar-body">
                                    {calendar.map((week, weekIndex) => (
                                        <div key={weekIndex} className="calendar-week">
                                            {week.map((day, dayIndex) => (
                                                <div
                                                    key={dayIndex}
                                                    className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''
                                                        } ${day.isToday ? 'today' : ''
                                                        } ${day.visits.length > 0 ? 'has-visits' : ''
                                                        } ${selectedDate === day.dateStr ? 'selected' : ''
                                                        }`}
                                                    onClick={() => handleDateClick(day)}
                                                >
                                                    <span className="day-number">
                                                        {day.date.getDate()}
                                                    </span>
                                                    {day.visits.length > 0 && (
                                                        <div className="visit-indicators">
                                                            {day.visits.slice(0, 2).map((visit, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="visit-item-mini"
                                                                    title={visit.restaurantName}
                                                                >
                                                                    <span className="visit-emoji">🍽️</span>
                                                                    <span className="visit-name">{visit.restaurantName}</span>
                                                                </div>
                                                            ))}
                                                            {day.visits.length > 2 && (
                                                                <div className="visit-more">
                                                                    +{day.visits.length - 2}개 더
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="calendar-actions">
                                <button
                                    onClick={() => setShowAddVisit(true)}
                                    className="btn-add-visit"
                                >
                                    ➕ 방문 기록 추가
                                </button>
                            </div>
                        </section>

                        {/* 선택된 날짜의 방문 기록 */}
                        {selectedVisits.length > 0 && (
                            <section className="visit-details-section">
                                <div className="section-header">
                                    <h3>📍 {new Date(selectedDate).toLocaleDateString()} 방문 기록</h3>
                                </div>

                                <div className="visit-list">
                                    {selectedVisits.map(visit => (
                                        <div key={visit._id} className="visit-item">
                                            <img
                                                src={visit.restaurantImage}
                                                alt={visit.restaurantName}
                                                className="visit-image"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                                }}
                                            />
                                            <div className="visit-info">
                                                <h4>{visit.restaurantName}</h4>
                                                <p className="visit-category">{visit.restaurantCategory}</p>
                                                {visit.rating && (
                                                    <div className="visit-rating">
                                                        {'⭐'.repeat(visit.rating)}
                                                    </div>
                                                )}
                                                {visit.memo && (
                                                    <p className="visit-memo">{visit.memo}</p>
                                                )}
                                                <span className="visit-type">
                                                    {visit.visitType === 'random' ? '🎲 랜덤 선택' :
                                                        visit.visitType === 'slot_machine' ? '🎰 슬롯머신' :
                                                            visit.visitType === 'worldcup' ? '🏆 월드컵' :
                                                                '✏️ 직접 추가'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => deleteVisit(visit._id)}
                                                className="btn-delete-visit"
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>

            {/* 방문 추가 모달 */}
            {showAddVisit && (
                <div className="modal-overlay" onClick={() => setShowAddVisit(false)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>➕ 방문 기록 추가</h3>
                        </div>
                        <div className="modal-body">
                            <div className="add-visit-form">
                                <div className="input-group">
                                    <label htmlFor="restaurant-select">가게 선택</label>
                                    <select
                                        id="restaurant-select"
                                        value={newVisit.restaurantId}
                                        onChange={(e) => setNewVisit(prev => ({ ...prev, restaurantId: e.target.value }))}
                                        className="visit-select"
                                    >
                                        <option value="">가게를 선택하세요</option>
                                        {restaurants.map(restaurant => (
                                            <option key={restaurant._id} value={restaurant._id}>
                                                {restaurant.name} ({restaurant.category})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label htmlFor="visit-date">방문 날짜</label>
                                    <input
                                        id="visit-date"
                                        type="date"
                                        value={newVisit.visitDate}
                                        onChange={(e) => setNewVisit(prev => ({ ...prev, visitDate: e.target.value }))}
                                        className="visit-input"
                                        max={getTodayLocal()}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>평점</label>
                                    <div className="star-rating">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewVisit(prev => ({ ...prev, rating: star }))}
                                                className={`star ${star <= newVisit.rating ? 'active' : ''}`}
                                            >
                                                ⭐
                                            </button>
                                        ))}
                                        <span className="rating-text">({newVisit.rating}점)</span>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label htmlFor="visit-memo">메모 (선택사항)</label>
                                    <textarea
                                        id="visit-memo"
                                        value={newVisit.memo}
                                        onChange={(e) => setNewVisit(prev => ({ ...prev, memo: e.target.value }))}
                                        placeholder="방문 소감이나 메모를 남겨보세요..."
                                        className="visit-textarea"
                                        rows={3}
                                        maxLength={200}
                                    />
                                    <div className="char-count">
                                        {newVisit.memo.length}/200
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="modal-btn cancel"
                                onClick={() => setShowAddVisit(false)}
                            >
                                취소
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={addVisit}
                                disabled={loading || !newVisit.restaurantId || !newVisit.visitDate}
                            >
                                {loading ? '추가 중...' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal />
        </>
    );
}