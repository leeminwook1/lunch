import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Vote() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    // 투표 관련 상태
    const [votes, setVotes] = useState([]);
    const [activeVotes, setActiveVotes] = useState([]);
    const [closedVotes, setClosedVotes] = useState([]);
    const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'detail'
    const [selectedVote, setSelectedVote] = useState(null);

    // 투표 생성 상태
    const [restaurants, setRestaurants] = useState([]);
    const [newVote, setNewVote] = useState({
        title: '',
        description: '',
        candidateIds: [],
        allowMultipleVotes: false,
        endTime: ''
    });

    // 필터 상태
    const [filterStatus, setFilterStatus] = useState('active');

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
                const savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
                const savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');

                if (savedUserId && savedUserName) {
                    setCurrentUser({ _id: savedUserId, name: savedUserName });
                } else {
                    router.push('/');
                    return;
                }

                // 가게 목록 로딩
                const restaurantsResult = await apiCall('/api/restaurants');
                if (restaurantsResult.success) {
                    setRestaurants(restaurantsResult.data);
                }

                // 투표 목록 로딩
                await loadVotes();
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 투표 목록 로딩
    const loadVotes = async () => {
        try {
            setLoading(true);
            const result = await apiCall('/api/votes');
            if (result.success) {
                setVotes(result.data);
                setActiveVotes(result.data.filter(v => v.status === 'active'));
                setClosedVotes(result.data.filter(v => v.status === 'closed'));
            }
        } catch (error) {
            console.error('투표 목록 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 투표 생성
    const createVote = async () => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        if (!newVote.title.trim()) {
            showModal('error', '입력 오류', '투표 제목을 입력해주세요.');
            return;
        }

        if (newVote.candidateIds.length < 2) {
            showModal('error', '입력 오류', '최소 2개 이상의 후보를 선택해주세요.');
            return;
        }

        if (!newVote.endTime) {
            showModal('error', '입력 오류', '마감 시간을 설정해주세요.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall('/api/votes', {
                method: 'POST',
                body: JSON.stringify({
                    ...newVote,
                    userId: currentUser._id,
                    userName: currentUser.name
                })
            });

            if (result.success) {
                showModal('success', '투표 생성 완료', '투표가 생성되었습니다!');
                setNewVote({
                    title: '',
                    description: '',
                    candidateIds: [],
                    allowMultipleVotes: false,
                    endTime: ''
                });
                setCurrentView('list');
                await loadVotes();
            }
        } catch (error) {
            console.error('투표 생성 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 투표하기
    const castVote = async (voteId, candidateId) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/votes/${voteId}/vote`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    candidateId
                })
            });

            if (result.success) {
                showModal('success', '투표 완료', '투표가 완료되었습니다!');
                setSelectedVote(result.data);
                await loadVotes();
            }
        } catch (error) {
            console.error('투표 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 투표 종료
    const closeVote = async (voteId) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        showModal('confirm', '투표 종료', '투표를 종료하시겠습니까?', async () => {
            try {
                setLoading(true);
                const result = await apiCall(`/api/votes/${voteId}/close`, {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: currentUser._id
                    })
                });

                if (result.success) {
                    showModal('success', '투표 종료', '투표가 종료되었습니다!');
                    setSelectedVote(result.data);
                    await loadVotes();
                }
            } catch (error) {
                console.error('투표 종료 실패:', error);
            } finally {
                setLoading(false);
            }
        });
    };

    // 투표 삭제
    const deleteVote = async (voteId) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        showModal('confirm', '투표 삭제', '투표를 삭제하시겠습니까?', async () => {
            try {
                setLoading(true);
                const result = await apiCall(`/api/votes/${voteId}`, {
                    method: 'DELETE',
                    body: JSON.stringify({
                        userId: currentUser._id
                    })
                });

                if (result.success) {
                    showModal('success', '삭제 완료', '투표가 삭제되었습니다!');
                    setCurrentView('list');
                    setSelectedVote(null);
                    await loadVotes();
                }
            } catch (error) {
                console.error('투표 삭제 실패:', error);
            } finally {
                setLoading(false);
            }
        });
    };

    // 투표 상세보기
    const viewVoteDetail = async (voteId) => {
        try {
            setLoading(true);
            const result = await apiCall(`/api/votes/${voteId}`);
            if (result.success) {
                setSelectedVote(result.data);
                setCurrentView('detail');
            }
        } catch (error) {
            console.error('투표 상세 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 후보 선택/해제
    const toggleCandidate = (restaurantId) => {
        setNewVote(prev => {
            const isSelected = prev.candidateIds.includes(restaurantId);
            return {
                ...prev,
                candidateIds: isSelected
                    ? prev.candidateIds.filter(id => id !== restaurantId)
                    : [...prev.candidateIds, restaurantId]
            };
        });
    };

    // 사용자가 투표했는지 확인
    const hasUserVoted = (vote) => {
        if (!currentUser) return false;
        return vote.candidates.some(c =>
            c.votes.some(v => v.userId === currentUser._id)
        );
    };

    // 사용자가 투표한 후보 찾기
    const getUserVotedCandidate = (vote) => {
        if (!currentUser) return null;
        return vote.candidates.find(c =>
            c.votes.some(v => v.userId === currentUser._id)
        );
    };

    // 남은 시간 계산
    const getTimeRemaining = (endTime) => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;

        if (diff <= 0) return '마감됨';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}일 남음`;
        } else if (hours > 0) {
            return `${hours}시간 ${minutes}분 남음`;
        } else {
            return `${minutes}분 남음`;
        }
    };

    // 기본 마감 시간 설정 (1시간 후)
    const getDefaultEndTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now.toISOString().slice(0, 16);
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

    const displayVotes = filterStatus === 'active' ? activeVotes : closedVotes;

    return (
        <>
            <Head>
                <title>그룹 투표 - 점심메뉴 선택기</title>
                <meta name="description" content="함께 점심 가게를 투표로 결정하세요!" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="app">
                <div className="container">
                    {/* 헤더 */}
                    <header className="header subpage-header">
                        <div className="header-content">
                            <div className="header-left">
                                <button
                                    onClick={() => {
                                        if (currentView !== 'list') {
                                            setCurrentView('list');
                                            setSelectedVote(null);
                                        } else {
                                            router.push('/');
                                        }
                                    }}
                                    className="btn-back"
                                >
                                    ← 돌아가기
                                </button>
                                <h1 className="title">🗳️ 그룹 투표</h1>
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
                        {/* 투표 목록 뷰 */}
                        {currentView === 'list' && (
                            <>
                                <section className="vote-intro-section">
                                    <div className="intro-content">
                                        <h2>👥 함께 결정하는 점심 메뉴</h2>
                                        <p>투표로 민주적으로 점심 가게를 선택해보세요!</p>
                                        <button
                                            onClick={() => setCurrentView('create')}
                                            className="btn-create-vote"
                                        >
                                            ➕ 새 투표 만들기
                                        </button>
                                    </div>
                                </section>

                                <section className="votes-list-section">
                                    <div className="section-header-row">
                                        <div className="section-title-group">
                                            <h3>📋 투표 목록</h3>
                                            <span className="total-count">
                                                총 {displayVotes.length}개
                                            </span>
                                        </div>
                                        <div className="vote-filters">
                                            <button
                                                onClick={() => setFilterStatus('active')}
                                                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                                            >
                                                🟢 진행중 <span className="count-badge">{activeVotes.length}</span>
                                            </button>
                                            <button
                                                onClick={() => setFilterStatus('closed')}
                                                className={`filter-btn ${filterStatus === 'closed' ? 'active' : ''}`}
                                            >
                                                ⚫ 종료됨 <span className="count-badge">{closedVotes.length}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="votes-grid">
                                        {loading ? (
                                            <div className="loading-state">
                                                <div className="spinner"></div>
                                                <p>투표를 불러오는 중...</p>
                                            </div>
                                        ) : displayVotes.length > 0 ? (
                                            displayVotes.map(vote => (
                                                <div
                                                    key={vote._id}
                                                    className="vote-card"
                                                    onClick={() => viewVoteDetail(vote._id)}
                                                >
                                                    <div className="vote-card-header">
                                                        <h4>{vote.title}</h4>
                                                        <span className={`vote-status ${vote.status}`}>
                                                            {vote.status === 'active' ? '🟢 진행중' : '⚫ 종료'}
                                                        </span>
                                                    </div>

                                                    {vote.description && (
                                                        <p className="vote-description">{vote.description}</p>
                                                    )}

                                                    <div className="vote-meta">
                                                        <span className="vote-creator">
                                                            👤 {vote.createdBy.userName}
                                                        </span>
                                                        <span className="vote-time">
                                                            ⏰ {getTimeRemaining(vote.endTime)}
                                                        </span>
                                                    </div>

                                                    <div className="vote-stats">
                                                        <span>📊 {vote.totalVoters}명 참여</span>
                                                        <span>🏪 {vote.candidates.length}개 후보</span>
                                                    </div>

                                                    {hasUserVoted(vote) && (
                                                        <div className="voted-badge">
                                                            ✅ 투표 완료
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-icon">🗳️</div>
                                                <h4>
                                                    {filterStatus === 'active'
                                                        ? '진행 중인 투표가 없습니다'
                                                        : '종료된 투표가 없습니다'}
                                                </h4>
                                                <p>새로운 투표를 만들어보세요!</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* 투표 생성 뷰 */}
                        {currentView === 'create' && (
                            <section className="vote-create-section">
                                <div className="section-header">
                                    <h2>➕ 새 투표 만들기</h2>
                                </div>

                                <div className="vote-form-container">
                                    <div className="vote-form-left">
                                        <div className="vote-form-card">
                                            <h3>📝 투표 정보</h3>

                                            <div className="input-group">
                                                <label htmlFor="vote-title">투표 제목 *</label>
                                                <input
                                                    id="vote-title"
                                                    type="text"
                                                    value={newVote.title}
                                                    onChange={(e) => setNewVote(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="예: 오늘 점심 뭐 먹을까요?"
                                                    className="vote-input"
                                                    maxLength={100}
                                                />
                                            </div>

                                            <div className="input-group">
                                                <label htmlFor="vote-description">설명 (선택)</label>
                                                <textarea
                                                    id="vote-description"
                                                    value={newVote.description}
                                                    onChange={(e) => setNewVote(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="투표에 대한 추가 설명을 입력하세요"
                                                    className="vote-textarea"
                                                    rows={4}
                                                    maxLength={200}
                                                />
                                            </div>

                                            <div className="input-group">
                                                <label htmlFor="vote-endtime">마감 시간 *</label>
                                                <input
                                                    id="vote-endtime"
                                                    type="datetime-local"
                                                    value={newVote.endTime || getDefaultEndTime()}
                                                    onChange={(e) => setNewVote(prev => ({ ...prev, endTime: e.target.value }))}
                                                    className="vote-input"
                                                    min={new Date().toISOString().slice(0, 16)}
                                                />
                                            </div>

                                            <div className="input-group">
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={newVote.allowMultipleVotes}
                                                        onChange={(e) => setNewVote(prev => ({ ...prev, allowMultipleVotes: e.target.checked }))}
                                                    />
                                                    <span>투표 변경 허용 (다른 후보로 재투표 가능)</span>
                                                </label>
                                            </div>

                                            <div className="form-actions">
                                                <button
                                                    onClick={() => {
                                                        setCurrentView('list');
                                                        setNewVote({
                                                            title: '',
                                                            description: '',
                                                            candidateIds: [],
                                                            allowMultipleVotes: false,
                                                            endTime: ''
                                                        });
                                                    }}
                                                    className="btn-cancel"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={createVote}
                                                    disabled={loading || !newVote.title.trim() || newVote.candidateIds.length < 2}
                                                    className="btn-submit"
                                                >
                                                    {loading ? '생성 중...' : '투표 만들기'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="vote-form-right">
                                        <div className="vote-form-card">
                                            <h3>🏪 후보 선택 * (최소 2개)</h3>
                                            <div className="selected-count-top">
                                                선택됨: <strong>{newVote.candidateIds.length}개</strong>
                                            </div>

                                            <div className="candidates-grid">
                                                {restaurants.map(restaurant => (
                                                    <div
                                                        key={restaurant._id}
                                                        className={`candidate-item ${newVote.candidateIds.includes(restaurant._id) ? 'selected' : ''}`}
                                                        onClick={() => toggleCandidate(restaurant._id)}
                                                    >
                                                        <img
                                                            src={restaurant.image}
                                                            alt={restaurant.name}
                                                            onError={(e) => {
                                                                e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                                            }}
                                                        />
                                                        <div className="candidate-info">
                                                            <h5>{restaurant.name}</h5>
                                                            <p>{restaurant.category}</p>
                                                            <p className="distance">🚶‍♂️ {restaurant.distance}</p>
                                                        </div>
                                                        {newVote.candidateIds.includes(restaurant._id) && (
                                                            <div className="selected-badge">✓</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 투표 상세 뷰 */}
                        {currentView === 'detail' && selectedVote && (
                            <section className="vote-detail-section">
                                <div className="vote-detail-layout">
                                    {/* 왼쪽: 투표 정보 */}
                                    <div className="vote-info-sidebar">
                                        <div className="vote-detail-header">
                                            <div className="header-top">
                                                <h2>{selectedVote.title}</h2>
                                                <span className={`vote-status ${selectedVote.status}`}>
                                                    {selectedVote.status === 'active' ? '🟢 진행중' : '⚫ 종료'}
                                                </span>
                                            </div>

                                            {selectedVote.description && (
                                                <p className="vote-description">{selectedVote.description}</p>
                                            )}

                                            <div className="vote-info-grid">
                                                <div className="info-item">
                                                    <span className="info-label">생성자</span>
                                                    <span className="info-value">👤 {selectedVote.createdBy.userName}</span>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">마감 시간</span>
                                                    <span className="info-value">
                                                        ⏰ {new Date(selectedVote.endTime).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">남은 시간</span>
                                                    <span className="info-value">
                                                        {getTimeRemaining(selectedVote.endTime)}
                                                    </span>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">참여자</span>
                                                    <span className="info-value">📊 {selectedVote.totalVoters}명</span>
                                                </div>
                                            </div>

                                            {selectedVote.createdBy.userId === currentUser?._id && selectedVote.status === 'active' && (
                                                <div className="creator-actions">
                                                    <button
                                                        onClick={() => closeVote(selectedVote._id)}
                                                        className="btn-close-vote"
                                                    >
                                                        🔒 투표 종료
                                                    </button>
                                                    <button
                                                        onClick={() => deleteVote(selectedVote._id)}
                                                        className="btn-delete-vote"
                                                    >
                                                        🗑️ 투표 삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {selectedVote.status === 'closed' && selectedVote.winner && (
                                            <div className="winner-section">
                                                <h3>🎉 투표 결과</h3>
                                                <div className="winner-card">
                                                    <div className="winner-badge">🏆 우승</div>
                                                    <h4>{selectedVote.winner.restaurantName}</h4>
                                                    <p>{selectedVote.winner.voteCount}표 획득</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 오른쪽: 후보 목록 */}
                                    <div className="candidates-main">
                                        <div className="candidates-section">
                                            <h3>🏪 후보 목록</h3>
                                            <div className="candidates-list">
                                                {selectedVote.candidates
                                                    .sort((a, b) => b.voteCount - a.voteCount)
                                                    .map((candidate, index) => {
                                                        const percentage = selectedVote.totalVoters > 0
                                                            ? Math.round((candidate.voteCount / selectedVote.totalVoters) * 100)
                                                            : 0;
                                                        const userVoted = candidate.votes.some(v => v.userId === currentUser?._id);

                                                        return (
                                                            <div
                                                                key={candidate.restaurantId}
                                                                className={`candidate-card ${userVoted ? 'user-voted' : ''} ${selectedVote.status === 'closed' && index === 0 ? 'winner' : ''}`}
                                                            >
                                                                <div className="candidate-rank">
                                                                    {index === 0 && selectedVote.status === 'closed' ? '🏆' : `${index + 1}위`}
                                                                </div>

                                                                <img
                                                                    src={candidate.restaurantImage}
                                                                    alt={candidate.restaurantName}
                                                                    onError={(e) => {
                                                                        e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                                                                    }}
                                                                />

                                                                <div className="candidate-details">
                                                                    <h4>{candidate.restaurantName}</h4>
                                                                    <p className="category">{candidate.restaurantCategory}</p>
                                                                    <p className="distance">🚶‍♂️ {candidate.restaurantDistance}</p>

                                                                    <div className="vote-progress">
                                                                        <div className="progress-bar">
                                                                            <div
                                                                                className="progress-fill"
                                                                                style={{ width: `${percentage}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <div className="vote-count">
                                                                            {candidate.voteCount}표 ({percentage}%)
                                                                        </div>
                                                                    </div>

                                                                    {selectedVote.status === 'active' && (
                                                                        <button
                                                                            onClick={() => castVote(selectedVote._id, candidate.restaurantId)}
                                                                            disabled={loading || userVoted}
                                                                            className={`btn-vote ${userVoted ? 'voted' : ''}`}
                                                                        >
                                                                            {userVoted ? '✅ 투표함' : '🗳️ 투표하기'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
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
