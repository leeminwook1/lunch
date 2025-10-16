import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function VoteDate() {
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
    const [newVote, setNewVote] = useState({
        title: '',
        description: '',
        candidates: [
            {
                date: '',
                timeSlots: [{ startTime: '18:00', endTime: '20:00' }]
            },
            {
                date: '',
                timeSlots: [{ startTime: '18:00', endTime: '20:00' }]
            }
        ],
        allowMultipleVotes: true,
        endTime: ''
    });

    // 기간 선택 상태
    const [periodSelection, setPeriodSelection] = useState({
        enabled: false,
        startDate: '',
        endDate: '',
        timeSlots: [{ startTime: '18:00', endTime: '20:00' }]
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
                // 서버에서 반환하는 오류 메시지 확인
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 기본 메시지 사용
                }
                throw new Error(errorMessage);
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
            const result = await apiCall('/api/vote-dates');
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

        if (newVote.candidates.length < 2) {
            showModal('error', '입력 오류', '최소 2개 이상의 날짜를 선택해주세요. 날짜 추가 버튼을 눌러 날짜를 추가해주세요.');
            return;
        }

        // 각 후보 날짜 검증
        for (let i = 0; i < newVote.candidates.length; i++) {
            const candidate = newVote.candidates[i];
            if (!candidate.date) {
                showModal('error', '입력 오류', `${i + 1}번째 날짜를 선택해주세요.`);
                return;
            }
            if (!candidate.timeSlots || candidate.timeSlots.length === 0) {
                showModal('error', '입력 오류', `${i + 1}번째 날짜에 시간대를 추가해주세요.`);
                return;
            }
            for (let j = 0; j < candidate.timeSlots.length; j++) {
                const timeSlot = candidate.timeSlots[j];
                if (!timeSlot.startTime || !timeSlot.endTime) {
                    showModal('error', '입력 오류', `${i + 1}번째 날짜의 ${j + 1}번째 시간대를 완성해주세요.`);
                    return;
                }
            }
        }

        if (!newVote.endTime) {
            showModal('error', '입력 오류', '마감 시간을 설정해주세요.');
            return;
        }

        try {
            setLoading(true);
            const requestData = {
                ...newVote,
                userId: currentUser._id,
                userName: currentUser.name
            };
            console.log('투표 생성 요청 데이터:', requestData);
            
            const result = await apiCall('/api/vote-dates', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            if (result.success) {
                showModal('success', '투표 생성 완료', '투표가 생성되었습니다!');
                setNewVote({
                    title: '',
                    description: '',
                    candidates: [],
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
    const castVote = async (voteId, candidateDate, timeSlot) => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/vote-dates/${voteId}/vote`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    candidateDate,
                    timeSlot
                })
            });

            if (result.success) {
                // 메시지에 따라 다른 제목과 내용 표시
                const isVoteCancel = result.message && result.message.includes('취소');
                const title = isVoteCancel ? '투표 취소' : '투표 완료';
                const message = isVoteCancel ? '투표가 취소되었습니다!' : '투표가 완료되었습니다!';
                
                showModal('success', title, message);
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
                const result = await apiCall(`/api/vote-dates/${voteId}/close`, {
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
                const result = await apiCall(`/api/vote-dates/${voteId}`, {
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
            const result = await apiCall(`/api/vote-dates/${voteId}`);
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

    // 기간 선택 토글
    const togglePeriodSelection = () => {
        setPeriodSelection(prev => ({
            ...prev,
            enabled: !prev.enabled
        }));
    };

    // 기간 시작일 변경
    const updatePeriodStartDate = (date) => {
        setPeriodSelection(prev => ({
            ...prev,
            startDate: date
        }));
    };

    // 기간 종료일 변경
    const updatePeriodEndDate = (date) => {
        setPeriodSelection(prev => ({
            ...prev,
            endDate: date
        }));
    };

    // 기간 시간대 변경
    const updatePeriodTimeSlot = (field, value) => {
        setPeriodSelection(prev => ({
            ...prev,
            timeSlots: [{
                ...prev.timeSlots[0],
                [field]: value
            }]
        }));
    };

    // 기간으로 후보 생성
    const generateCandidatesFromPeriod = () => {
        if (!periodSelection.startDate || !periodSelection.endDate) {
            showModal('error', '오류', '시작일과 종료일을 모두 선택해주세요.');
            return;
        }

        const startDate = new Date(periodSelection.startDate);
        const endDate = new Date(periodSelection.endDate);
        
        if (startDate > endDate) {
            showModal('error', '오류', '시작일은 종료일보다 이전이어야 합니다.');
            return;
        }

        const candidates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            candidates.push({
                date: currentDate.toISOString().split('T')[0],
                timeSlots: [...periodSelection.timeSlots]
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        setNewVote(prev => ({
            ...prev,
            candidates
        }));

        showModal('success', '완료', `${candidates.length}개의 날짜가 추가되었습니다.`);
    };

    // 날짜 추가
    const addDate = () => {
        setNewVote(prev => ({
            ...prev,
            candidates: [...prev.candidates, {
                date: '',
                timeSlots: [{ startTime: '18:00', endTime: '20:00' }]
            }]
        }));
    };

    // 날짜 제거
    const removeDate = (index) => {
        setNewVote(prev => ({
            ...prev,
            candidates: prev.candidates.filter((_, i) => i !== index)
        }));
    };

    // 날짜 변경
    const updateDate = (index, date) => {
        setNewVote(prev => ({
            ...prev,
            candidates: prev.candidates.map((candidate, i) => 
                i === index ? { ...candidate, date } : candidate
            )
        }));
    };

    // 시간대 추가
    const addTimeSlot = (dateIndex) => {
        setNewVote(prev => ({
            ...prev,
            candidates: prev.candidates.map((candidate, i) => 
                i === dateIndex 
                    ? { ...candidate, timeSlots: [...candidate.timeSlots, { startTime: '', endTime: '' }] }
                    : candidate
            )
        }));
    };

    // 시간대 제거
    const removeTimeSlot = (dateIndex, timeSlotIndex) => {
        setNewVote(prev => ({
            ...prev,
            candidates: prev.candidates.map((candidate, i) => 
                i === dateIndex 
                    ? { ...candidate, timeSlots: candidate.timeSlots.filter((_, j) => j !== timeSlotIndex) }
                    : candidate
            )
        }));
    };

    // 시간대 변경
    const updateTimeSlot = (dateIndex, timeSlotIndex, field, value) => {
        setNewVote(prev => ({
            ...prev,
            candidates: prev.candidates.map((candidate, i) => 
                i === dateIndex 
                    ? {
                        ...candidate,
                        timeSlots: candidate.timeSlots.map((timeSlot, j) => 
                            j === timeSlotIndex ? { ...timeSlot, [field]: value } : timeSlot
                        )
                    }
                    : candidate
            )
        }));
    };

    // 사용자가 투표했는지 확인
    const hasUserVoted = (vote) => {
        if (!currentUser) return false;
        return vote.candidates.some(candidate =>
            candidate.timeSlots.some(timeSlot =>
                timeSlot.votes.some(v => v.userId === currentUser._id)
            )
        );
    };

    // 사용자가 투표한 시간대 찾기
    const getUserVotedTimeSlot = (vote) => {
        if (!currentUser) return null;
        for (const candidate of vote.candidates) {
            for (const timeSlot of candidate.timeSlots) {
                if (timeSlot.votes.some(v => v.userId === currentUser._id)) {
                    return { candidate, timeSlot };
                }
            }
        }
        return null;
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

    // 기본 마감 시간 설정 (3일 후)
    const getDefaultEndTime = () => {
        const now = new Date();
        now.setDate(now.getDate() + 3);
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
                <title>회식 날짜 투표 - 점심메뉴 선택기</title>
                <meta name="description" content="함께 회식 날짜를 투표로 결정하세요!" />
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
                                <h1 className="title">📅 회식 날짜 투표</h1>
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
                                        <h2>🍻 함께 결정하는 회식 날짜</h2>
                                        <p>투표로 민주적으로 회식 날짜와 시간을 선택해보세요!</p>
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
                                                        <span>📅 {vote.candidates.length}개 날짜</span>
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
                                                <div className="empty-icon">📅</div>
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
                                    <h2>➕ 새 회식 날짜 투표 만들기</h2>
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
                                                    placeholder="예: 이번 달 회식 날짜 정하기"
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
                                                    <span>중복 투표 허용 (여러 날짜/시간에 투표 가능)</span>
                                                </label>
                                            </div>

                                            <div className="form-actions">
                                                <button
                                                    onClick={() => {
                                                        setCurrentView('list');
                                                        setNewVote({
                                                            title: '',
                                                            description: '',
                                                            candidates: [],
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
                                                    disabled={loading || !newVote.title.trim() || newVote.candidates.length < 2}
                                                    className="btn-submit"
                                                >
                                                    {loading ? '생성 중...' : '투표 만들기'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="vote-form-right">
                                        <div className="vote-form-card">
                                            <h3>📅 후보 날짜 선택 * (최소 2개)</h3>
                                            <div className="selected-count-top">
                                                선택됨: <strong>{newVote.candidates.length}개</strong>
                                            </div>

                                            {/* 기간 선택 옵션 */}
                                            <div className="period-selection-container">
                                                <div className="period-toggle">
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={periodSelection.enabled}
                                                            onChange={togglePeriodSelection}
                                                        />
                                                        <span className="checkmark"></span>
                                                        📅 기간으로 일괄 추가 (일주일 등)
                                                    </label>
                                                </div>

                                                {periodSelection.enabled && (
                                                    <div className="period-inputs">
                                                        <div className="period-date-inputs">
                                                            <div className="date-input-group">
                                                                <label>시작일</label>
                                                                <input
                                                                    type="date"
                                                                    value={periodSelection.startDate}
                                                                    onChange={(e) => updatePeriodStartDate(e.target.value)}
                                                                    min={new Date().toISOString().split('T')[0]}
                                                                />
                                                            </div>
                                                            <div className="date-input-group">
                                                                <label>종료일</label>
                                                                <input
                                                                    type="date"
                                                                    value={periodSelection.endDate}
                                                                    onChange={(e) => updatePeriodEndDate(e.target.value)}
                                                                    min={periodSelection.startDate || new Date().toISOString().split('T')[0]}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="period-time-inputs">
                                                            <label>시간대</label>
                                                            <div className="time-input-group">
                                                                <input
                                                                    type="time"
                                                                    value={periodSelection.timeSlots[0].startTime}
                                                                    onChange={(e) => updatePeriodTimeSlot('startTime', e.target.value)}
                                                                />
                                                                <span>~</span>
                                                                <input
                                                                    type="time"
                                                                    value={periodSelection.timeSlots[0].endTime}
                                                                    onChange={(e) => updatePeriodTimeSlot('endTime', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={generateCandidatesFromPeriod}
                                                            className="btn-generate-period"
                                                        >
                                                            📅 기간으로 후보 생성
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="date-candidates-container">
                                                {newVote.candidates.map((candidate, dateIndex) => (
                                                    <div key={dateIndex} className="date-candidate-item">
                                                        <div className="date-header">
                                                            <input
                                                                type="date"
                                                                value={candidate.date}
                                                                onChange={(e) => updateDate(dateIndex, e.target.value)}
                                                                className="date-input"
                                                                min={new Date().toISOString().split('T')[0]}
                                                            />
                                                            <button
                                                                onClick={() => removeDate(dateIndex)}
                                                                className="btn-remove-date"
                                                                disabled={newVote.candidates.length <= 2}
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>

                                                        <div className="time-slots-container">
                                                            <div className="time-slots-header">
                                                                <span>시간대</span>
                                                            </div>

                                                            {candidate.timeSlots.map((timeSlot, timeSlotIndex) => (
                                                                <div key={timeSlotIndex} className="time-slot-item">
                                                                    <input
                                                                        type="time"
                                                                        value={timeSlot.startTime}
                                                                        onChange={(e) => updateTimeSlot(dateIndex, timeSlotIndex, 'startTime', e.target.value)}
                                                                        className="time-input"
                                                                    />
                                                                    <span>~</span>
                                                                    <input
                                                                        type="time"
                                                                        value={timeSlot.endTime}
                                                                        onChange={(e) => updateTimeSlot(dateIndex, timeSlotIndex, 'endTime', e.target.value)}
                                                                        className="time-input"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={addDate}
                                                    className="btn-add-date"
                                                >
                                                    ➕ 날짜 추가
                                                </button>
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
                                                    <div className="winner-content">
                                                        <div className="winner-badge">🏆 우승</div>
                                                        <div className="winner-info">
                                                            <div className="winner-date">
                                                                <span className="info-icon">📅</span>
                                                                <span className="info-text">
                                                                    {new Date(selectedVote.winner.date).toLocaleDateString('ko-KR', { 
                                                                        year: 'numeric', 
                                                                        month: 'long', 
                                                                        day: 'numeric',
                                                                        weekday: 'long'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <div className="winner-time">
                                                                <span className="info-icon">🕐</span>
                                                                <span className="info-text">
                                                                    {selectedVote.winner.timeSlot.startTime} ~ {selectedVote.winner.timeSlot.endTime}
                                                                </span>
                                                            </div>
                                                            <div className="winner-votes">
                                                                <span className="info-icon">📊</span>
                                                                <span className="info-text">
                                                                    {selectedVote.winner.voteCount}표 획득
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 오른쪽: 후보 목록 */}
                                    <div className="candidates-main">
                                        <div className="candidates-section">
                                            <h3>📅 후보 날짜 목록</h3>
                                            <div className="survey-form-container">
                                                {selectedVote.candidates
                                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                    .map((candidate, candidateIndex) => {
                                                        const userVotedTimeSlot = getUserVotedTimeSlot(selectedVote);
                                                        const userVotedThisDate = userVotedTimeSlot && 
                                                            new Date(userVotedTimeSlot.candidate.date).toDateString() === new Date(candidate.date).toDateString();

                                                        return (
                                                            <div key={candidateIndex} className="survey-question-card">
                                                                <div className="question-header">
                                                                    <h4 className="question-title">
                                                                        📅 {new Date(candidate.date).toLocaleDateString('ko-KR', { 
                                                                            year: 'numeric', 
                                                                            month: 'long', 
                                                                            day: 'numeric',
                                                                            weekday: 'long'
                                                                        })}
                                                                    </h4>
                                                                    <span className="question-votes">
                                                                        총 {candidate.totalVotes}표
                                                                    </span>
                                                                </div>

                                                                <div className="survey-options">
                                                                    {candidate.timeSlots
                                                                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                                        .map((timeSlot, timeSlotIndex) => {
                                                                            const percentage = selectedVote.totalVoters > 0
                                                                                ? Math.round((timeSlot.voteCount / selectedVote.totalVoters) * 100)
                                                                                : 0;
                                                                            const userVoted = timeSlot.votes.some(v => v.userId === currentUser?._id);
                                                                            const isWinner = selectedVote.status === 'closed' && 
                                                                                selectedVote.winner && 
                                                                                new Date(selectedVote.winner.date).toDateString() === new Date(candidate.date).toDateString() &&
                                                                                selectedVote.winner.timeSlot.startTime === timeSlot.startTime &&
                                                                                selectedVote.winner.timeSlot.endTime === timeSlot.endTime;

                                                                            return (
                                                                                <div
                                                                                    key={timeSlotIndex}
                                                                                    className={`survey-option ${userVoted ? 'selected' : ''} ${isWinner ? 'winner' : ''}`}
                                                                                >
                                                                                    <div className="option-content">
                                                                                        <div className="option-time">
                                                                                            <span className="time-icon">🕐</span>
                                                                                            <span className="time-text">
                                                                                                {timeSlot.startTime} ~ {timeSlot.endTime}
                                                                                            </span>
                                                                                            {isWinner && <span className="winner-badge">🏆</span>}
                                                                                        </div>
                                                                                        
                                                                                        <div className="option-stats">
                                                                                            <div className="vote-progress-mini">
                                                                                                <div className="progress-bar-mini">
                                                                                                    <div
                                                                                                        className="progress-fill-mini"
                                                                                                        style={{ width: `${percentage}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                                <span className="vote-count-mini">
                                                                                                    {timeSlot.voteCount}표 ({percentage}%)
                                                                                                </span>
                                                                                            </div>
                                                                                            
                                                                                            {/* 투표자 목록 */}
                                                                                            {timeSlot.votes && timeSlot.votes.length > 0 && (
                                                                                                <div className="voters-list">
                                                                                                    <div className="voters-header">
                                                                                                        <span className="voters-label">투표자:</span>
                                                                                                        <span className="voters-count">{timeSlot.votes.length}명</span>
                                                                                                    </div>
                                                                                                    <div className="voters-names">
                                                                                                        {timeSlot.votes.map((vote, voteIndex) => (
                                                                                                            <span key={voteIndex} className="voter-name">
                                                                                                                {vote.userName}
                                                                                                                {vote.userId === currentUser?._id && <span className="current-user-badge">나</span>}
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {selectedVote.status === 'active' && (
                                                                                        <button
                                                                                            onClick={() => castVote(selectedVote._id, candidate.date, {
                                                                                                startTime: timeSlot.startTime,
                                                                                                endTime: timeSlot.endTime
                                                                                            })}
                                                                                            disabled={loading}
                                                                                            className={`survey-option-btn ${userVoted ? 'voted' : ''} ${selectedVote.allowMultipleVotes ? 'allow-multiple' : ''}`}
                                                                                        >
                                                                                            {userVoted ? '❌ 취소' : '🗳️ 투표'}
                                                                                        </button>
                                                                                    )}

                                                                                    {userVotedThisDate && userVoted && !selectedVote.allowMultipleVotes && (
                                                                                        <div className="voted-indicator-mini">
                                                                                            ✅
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
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
