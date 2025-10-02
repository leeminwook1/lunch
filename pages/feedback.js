import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Feedback() {
    const router = useRouter();
    const [feedbacks, setFeedbacks] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [isAdmin, setIsAdmin] = useState(false);
    
    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // 피드백 작성 상태
    const [newFeedback, setNewFeedback] = useState({
        type: 'feature_request',
        title: '',
        content: '',
        priority: 'medium'
    });
    
    // 필터 상태
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // 관리자 관련 상태
    const [editingFeedback, setEditingFeedback] = useState(null);
    const [adminReply, setAdminReply] = useState('');
    const [newStatus, setNewStatus] = useState('');

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

                await loadFeedbacks();
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        };

        initializeData();
    }, []);

    // 피드백 로딩
    const loadFeedbacks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            if (filterType !== 'all') {
                params.append('type', filterType);
            }
            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }
            
            const queryString = params.toString();
            const url = queryString ? `/api/feedback?${queryString}` : '/api/feedback';
            
            const result = await apiCall(url);
            if (result.success) {
                setFeedbacks(result.data);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('피드백 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 피드백 작성
    const submitFeedback = async () => {
        if (!currentUser) {
            showModal('error', '오류', '로그인이 필요합니다.');
            return;
        }

        if (!newFeedback.title.trim() || !newFeedback.content.trim()) {
            showModal('error', '입력 오류', '제목과 내용을 모두 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall('/api/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser._id,
                    userName: currentUser.name,
                    type: newFeedback.type,
                    title: newFeedback.title.trim(),
                    content: newFeedback.content.trim(),
                    priority: newFeedback.priority
                })
            });

            if (result.success) {
                showModal('success', '피드백 작성 완료', '피드백이 성공적으로 작성되었습니다!');
                setNewFeedback({
                    type: 'feature_request',
                    title: '',
                    content: '',
                    priority: 'medium'
                });
                await loadFeedbacks();
            }
        } catch (error) {
            console.error('피드백 작성 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 피드백 상태 업데이트 (관리자만)
    const updateFeedbackStatus = async (feedbackId, status, reply = '') => {
        if (!isAdmin) {
            showModal('error', '권한 없음', '관리자만 피드백 상태를 변경할 수 있습니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/feedback/${feedbackId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status,
                    adminReply: reply,
                    adminId: currentUser._id
                })
            });

            if (result.success) {
                showModal('success', '업데이트 완료', '피드백 상태가 업데이트되었습니다!');
                setEditingFeedback(null);
                setAdminReply('');
                setNewStatus('');
                await loadFeedbacks();
            }
        } catch (error) {
            console.error('피드백 상태 업데이트 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 피드백 삭제 (관리자만)
    const deleteFeedback = async (feedbackId) => {
        if (!isAdmin) {
            showModal('error', '권한 없음', '관리자만 피드백을 삭제할 수 있습니다.');
            return;
        }

        showModal('confirm', '피드백 삭제', '정말로 이 피드백을 삭제하시겠습니까?', async () => {
            try {
                setLoading(true);
                const result = await apiCall(`/api/feedback/${feedbackId}`, {
                    method: 'DELETE'
                });

                if (result.success) {
                    showModal('success', '삭제 완료', '피드백이 삭제되었습니다!');
                    await loadFeedbacks();
                }
            } catch (error) {
                console.error('피드백 삭제 실패:', error);
            } finally {
                setLoading(false);
            }
        });
    };

    // 필터 변경 시 피드백 다시 로딩
    useEffect(() => {
        loadFeedbacks();
    }, [filterType, filterStatus]);

    // 페이지네이션 계산
    const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedFeedbacks = feedbacks.slice(startIndex, startIndex + itemsPerPage);

    // 피드백 타입 매핑
    const typeMap = {
        feature_request: { emoji: '💡', label: '기능 요청', color: 'var(--primary-500)' },
        bug_report: { emoji: '🐛', label: '버그 신고', color: 'var(--error-500)' },
        improvement: { emoji: '⚡', label: '개선 제안', color: 'var(--warning-500)' },
        general: { emoji: '💬', label: '일반 의견', color: 'var(--gray-500)' }
    };

    // 상태 매핑
    const statusMap = {
        pending: { emoji: '⏳', label: '대기중', color: 'var(--warning-500)' },
        in_progress: { emoji: '🔄', label: '진행중', color: 'var(--primary-500)' },
        completed: { emoji: '✅', label: '완료', color: 'var(--success-500)' },
        rejected: { emoji: '❌', label: '거절', color: 'var(--error-500)' }
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

    return (
        <>
            <Head>
                <title>피드백 - 점심메뉴 선택기</title>
                <meta name="description" content="의견을 남겨주세요!" />
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
                                <h1 className="title">📝 피드백</h1>
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
                        {/* 피드백 작성 섹션 */}
                        {currentUser && (
                            <section className="feedback-write-section">
                                <div className="section-header">
                                    <h2>✍️ 피드백 작성</h2>
                                    <p>서비스 개선을 위한 소중한 의견을 남겨주세요!</p>
                                </div>
                                
                                <div className="feedback-form">
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label htmlFor="feedback-type">피드백 유형</label>
                                            <select
                                                id="feedback-type"
                                                value={newFeedback.type}
                                                onChange={(e) => setNewFeedback(prev => ({ ...prev, type: e.target.value }))}
                                                className="feedback-select"
                                            >
                                                <option value="feature_request">💡 기능 요청</option>
                                                <option value="bug_report">🐛 버그 신고</option>
                                                <option value="improvement">⚡ 개선 제안</option>
                                                <option value="general">💬 일반 의견</option>
                                            </select>
                                        </div>

                                        <div className="input-group">
                                            <label htmlFor="feedback-priority">우선순위</label>
                                            <select
                                                id="feedback-priority"
                                                value={newFeedback.priority}
                                                onChange={(e) => setNewFeedback(prev => ({ ...prev, priority: e.target.value }))}
                                                className="feedback-select"
                                            >
                                                <option value="low">🟢 낮음</option>
                                                <option value="medium">🟡 보통</option>
                                                <option value="high">🔴 높음</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="feedback-title">제목</label>
                                        <input
                                            id="feedback-title"
                                            type="text"
                                            value={newFeedback.title}
                                            onChange={(e) => setNewFeedback(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="피드백 제목을 입력하세요"
                                            className="feedback-input"
                                            maxLength={100}
                                        />
                                        <div className="char-count">
                                            {newFeedback.title.length}/100
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="feedback-content">내용</label>
                                        <textarea
                                            id="feedback-content"
                                            value={newFeedback.content}
                                            onChange={(e) => setNewFeedback(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="자세한 내용을 입력해주세요..."
                                            className="feedback-textarea"
                                            rows={6}
                                            maxLength={1000}
                                        />
                                        <div className="char-count">
                                            {newFeedback.content.length}/1000
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button 
                                            onClick={submitFeedback}
                                            disabled={loading || !newFeedback.title.trim() || !newFeedback.content.trim()}
                                            className="btn-submit-feedback"
                                        >
                                            {loading ? '작성 중...' : '📝 피드백 작성'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 피드백 목록 섹션 */}
                        <section className="feedback-list-section">
                            <div className="section-header">
                                <h2>💬 피드백 목록</h2>
                                <span className="count-badge">{feedbacks.length}개</span>
                            </div>

                            {/* 필터 */}
                            <div className="feedback-filters">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">전체 유형</option>
                                    <option value="feature_request">💡 기능 요청</option>
                                    <option value="bug_report">🐛 버그 신고</option>
                                    <option value="improvement">⚡ 개선 제안</option>
                                    <option value="general">💬 일반 의견</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">전체 상태</option>
                                    <option value="pending">⏳ 대기중</option>
                                    <option value="in_progress">🔄 진행중</option>
                                    <option value="completed">✅ 완료</option>
                                    <option value="rejected">❌ 거절</option>
                                </select>
                            </div>

                            {/* 피드백 목록 */}
                            <div className="feedback-list">
                                {loading ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>피드백을 불러오는 중...</p>
                                    </div>
                                ) : paginatedFeedbacks.length > 0 ? (
                                    paginatedFeedbacks.map(feedback => (
                                        <div key={feedback._id} className="feedback-item">
                                            <div className="feedback-header">
                                                <div className="feedback-meta">
                                                    <span 
                                                        className="feedback-type"
                                                        style={{ backgroundColor: typeMap[feedback.type]?.color }}
                                                    >
                                                        {typeMap[feedback.type]?.emoji} {typeMap[feedback.type]?.label}
                                                    </span>
                                                    <span 
                                                        className="feedback-status"
                                                        style={{ backgroundColor: statusMap[feedback.status]?.color }}
                                                    >
                                                        {statusMap[feedback.status]?.emoji} {statusMap[feedback.status]?.label}
                                                    </span>
                                                    <span className="feedback-priority priority-{feedback.priority}">
                                                        {feedback.priority === 'high' ? '🔴' : 
                                                         feedback.priority === 'medium' ? '🟡' : '🟢'}
                                                    </span>
                                                </div>
                                                <div className="feedback-actions">
                                                    <span className="feedback-date">
                                                        {new Date(feedback.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFeedback(feedback);
                                                                    setNewStatus(feedback.status);
                                                                    setAdminReply(feedback.adminReply || '');
                                                                }}
                                                                className="btn-edit-feedback"
                                                                title="수정"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => deleteFeedback(feedback._id)}
                                                                className="btn-delete-feedback"
                                                                title="삭제"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="feedback-content">
                                                <h3 className="feedback-title">{feedback.title}</h3>
                                                <p className="feedback-text">{feedback.content}</p>
                                                <div className="feedback-author">
                                                    작성자: <strong>{feedback.userName}</strong>
                                                </div>
                                            </div>

                                            {feedback.adminReply && (
                                                <div className="admin-reply">
                                                    <div className="reply-header">
                                                        <span className="reply-label">👨‍💼 관리자 답변</span>
                                                    </div>
                                                    <p className="reply-content">{feedback.adminReply}</p>
                                                </div>
                                            )}

                                            {/* 관리자 수정 폼 */}
                                            {isAdmin && editingFeedback?._id === feedback._id && (
                                                <div className="admin-edit-form">
                                                    <div className="edit-form-header">
                                                        <h4>관리자 수정</h4>
                                                    </div>
                                                    
                                                    <div className="input-group">
                                                        <label>상태 변경</label>
                                                        <select
                                                            value={newStatus}
                                                            onChange={(e) => setNewStatus(e.target.value)}
                                                            className="status-select"
                                                        >
                                                            <option value="pending">⏳ 대기중</option>
                                                            <option value="in_progress">🔄 진행중</option>
                                                            <option value="completed">✅ 완료</option>
                                                            <option value="rejected">❌ 거절</option>
                                                        </select>
                                                    </div>

                                                    <div className="input-group">
                                                        <label>관리자 답변</label>
                                                        <textarea
                                                            value={adminReply}
                                                            onChange={(e) => setAdminReply(e.target.value)}
                                                            placeholder="사용자에게 전달할 답변을 입력하세요..."
                                                            className="admin-reply-textarea"
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div className="edit-form-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingFeedback(null);
                                                                setAdminReply('');
                                                                setNewStatus('');
                                                            }}
                                                            className="btn-cancel-edit"
                                                        >
                                                            취소
                                                        </button>
                                                        <button
                                                            onClick={() => updateFeedbackStatus(feedback._id, newStatus, adminReply)}
                                                            className="btn-save-edit"
                                                            disabled={loading}
                                                        >
                                                            {loading ? '저장 중...' : '저장'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">📝</div>
                                        <h4>피드백이 없습니다</h4>
                                        <p>첫 번째 피드백을 작성해보세요!</p>
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