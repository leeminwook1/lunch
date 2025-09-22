import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Feedback() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [isAdmin, setIsAdmin] = useState(false);
    const modalTimeoutRef = useRef(null);
    
    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
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

    // 모달 관련 함수들
    const showModal = (type, title, message, onConfirm = null) => {
        if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
        }
        
        if (modal.isOpen) {
            setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
            modalTimeoutRef.current = setTimeout(() => {
                setModal({ isOpen: true, type, title, message, onConfirm });
            }, 100);
        } else {
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
                setIsAdmin(savedUserName === '관리자');
            }
            
            await loadFeedbacks();
        };

        initializeData();
        
        return () => {
            if (modalTimeoutRef.current) {
                clearTimeout(modalTimeoutRef.current);
            }
        };
    }, []);

    const loadFeedbacks = async () => {
        try {
            let query = '?limit=100';
            if (filterType !== 'all') query += `&type=${filterType}`;
            if (filterStatus !== 'all') query += `&status=${filterStatus}`;
            
            const result = await apiCall(`/api/feedback${query}`);
            if (result.success) {
                setFeedbacks(result.data);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('피드백 로딩 실패:', error);
        }
    };

    const submitFeedback = async () => {
        if (loading) return;
        
        if (!currentUser) {
            showModal('error', '로그인 필요', '피드백을 작성하려면 로그인이 필요합니다.');
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
                showModal('success', '피드백 제출 완료', '소중한 의견 감사합니다! 검토 후 반영하겠습니다.');
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

    const deleteFeedback = async (feedbackId) => {
        if (!currentUser) {
            showModal('error', '로그인 필요', '로그인이 필요합니다.');
            return;
        }

        try {
            setLoading(true);
            const result = await apiCall(`/api/feedback/${feedbackId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    userId: currentUser._id
                })
            });

            if (result.success) {
                showModal('success', '삭제 완료', '피드백이 삭제되었습니다.');
                await loadFeedbacks();
            }
        } catch (error) {
            console.error('피드백 삭제 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 관리자 피드백 업데이트 함수
    const updateFeedbackStatus = async (feedbackId, status, replyContent = '') => {
        if (!isAdmin) {
            showModal('error', '권한 없음', '관리자만 피드백을 수정할 수 있습니다.');
            return;
        }

        try {
            setLoading(true);
            console.log('전송할 데이터:', {
                userId: currentUser._id,
                status: status,
                adminReplyContent: replyContent
            });
            
            const result = await apiCall(`/api/feedback/${feedbackId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    userId: currentUser._id,
                    status: status,
                    adminReplyContent: replyContent
                })
            });

            console.log('API 응답:', result);

            if (result.success) {
                showModal('success', '업데이트 완료', '피드백이 성공적으로 업데이트되었습니다!');
                setEditingFeedback(null);
                setAdminReply('');
                setNewStatus('');
                await loadFeedbacks();
            }
        } catch (error) {
            console.error('피드백 업데이트 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 관리자 편집 시작
    const startEditFeedback = (feedback) => {
        setEditingFeedback(feedback._id);
        setNewStatus(feedback.status);
        setAdminReply(feedback.adminReply?.content || '');
    };

    // 관리자 편집 취소
    const cancelEditFeedback = () => {
        setEditingFeedback(null);
        setAdminReply('');
        setNewStatus('');
    };

    // 필터 변경 시 피드백 다시 로드
    useEffect(() => {
        if (currentUser) {
            loadFeedbacks();
        }
    }, [filterType, filterStatus]);

    // 타입별 이모지와 라벨
    const getTypeInfo = (type) => {
        const typeMap = {
            feature_request: { emoji: '💡', label: '기능 요청' },
            bug_report: { emoji: '🐛', label: '버그 신고' },
            improvement: { emoji: '⚡', label: '개선 제안' },
            general: { emoji: '💬', label: '일반 의견' }
        };
        return typeMap[type] || { emoji: '💬', label: '일반 의견' };
    };

    // 상태별 스타일
    const getStatusStyle = (status) => {
        const statusMap = {
            pending: { class: 'status-pending', label: '대기중' },
            in_progress: { class: 'status-progress', label: '진행중' },
            completed: { class: 'status-completed', label: '완료' },
            rejected: { class: 'status-rejected', label: '거절됨' }
        };
        return statusMap[status] || { class: 'status-pending', label: '대기중' };
    };

    // 우선순위별 스타일
    const getPriorityStyle = (priority) => {
        const priorityMap = {
            low: { class: 'priority-low', label: '낮음' },
            medium: { class: 'priority-medium', label: '보통' },
            high: { class: 'priority-high', label: '높음' }
        };
        return priorityMap[priority] || { class: 'priority-medium', label: '보통' };
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
                    <h1>피드백 페이지</h1>
                    <p>피드백을 보려면 먼저 메인 페이지에서 로그인해주세요.</p>
                    <a href="/">메인 페이지로 이동</a>
                </div>
            </div>
        );
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedFeedbacks = feedbacks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(feedbacks.length / itemsPerPage);

    return (
        <>
            <Head>
                <title>피드백 - 점심메뉴 선택기</title>
                <meta name="description" content="기능 요청 및 개선사항을 제안해주세요" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="App">
                <div className="container">
                    <div className="header">
                        <h1 className="title">💭 피드백 & 기능 요청</h1>
                        <a href="/" className="home-btn">
                            <span className="home-icon">🏠</span>
                            메인으로
                        </a>
                    </div>

                    {/* 피드백 작성 폼 */}
                    <div className="feedback-form-section">
                        <h3>✍️ 피드백 작성</h3>
                        <div className="feedback-form">
                            <div className="feedback-form-row">
                                <div className="form-group">
                                    <label>분류</label>
                                    <select
                                        value={newFeedback.type}
                                        onChange={(e) => setNewFeedback(prev => ({ ...prev, type: e.target.value }))}
                                    >
                                        <option value="feature_request">💡 기능 요청</option>
                                        <option value="bug_report">🐛 버그 신고</option>
                                        <option value="improvement">⚡ 개선 제안</option>
                                        <option value="general">💬 일반 의견</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>우선순위</label>
                                    <select
                                        value={newFeedback.priority}
                                        onChange={(e) => setNewFeedback(prev => ({ ...prev, priority: e.target.value }))}
                                    >
                                        <option value="low">낮음</option>
                                        <option value="medium">보통</option>
                                        <option value="high">높음</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>제목</label>
                                <input
                                    type="text"
                                    value={newFeedback.title}
                                    onChange={(e) => setNewFeedback(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="간단하고 명확한 제목을 작성해주세요"
                                    maxLength="100"
                                />
                                <small>{newFeedback.title.length}/100</small>
                            </div>

                            <div className="form-group">
                                <label>내용</label>
                                <textarea
                                    value={newFeedback.content}
                                    onChange={(e) => setNewFeedback(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="자세한 내용을 작성해주세요. 기능 요청의 경우 어떤 상황에서 필요한지, 어떻게 동작했으면 좋겠는지 구체적으로 설명해주세요."
                                    rows="5"
                                    maxLength="1000"
                                />
                                <small>{newFeedback.content.length}/1000</small>
                            </div>

                            <button
                                className="submit-feedback-btn"
                                onClick={submitFeedback}
                                disabled={loading || !newFeedback.title.trim() || !newFeedback.content.trim()}
                            >
                                {loading ? '제출 중...' : '📤 피드백 제출'}
                            </button>
                        </div>
                    </div>

                    {/* 필터 */}
                    <div className="feedback-filters">
                        <div className="feedback-filter-group">
                            <label>분류별 필터</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">전체</option>
                                <option value="feature_request">💡 기능 요청</option>
                                <option value="bug_report">🐛 버그 신고</option>
                                <option value="improvement">⚡ 개선 제안</option>
                                <option value="general">💬 일반 의견</option>
                            </select>
                        </div>

                        <div className="feedback-filter-group">
                            <label>상태별 필터</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">전체</option>
                                <option value="pending">대기중</option>
                                <option value="in_progress">진행중</option>
                                <option value="completed">완료</option>
                                <option value="rejected">거절됨</option>
                            </select>
                        </div>
                    </div>

                    {/* 피드백 목록 */}
                    <div className="feedbacks-section">
                        <h3>📋 제출된 피드백 ({feedbacks.length}개)</h3>
                        
                        {feedbacks.length === 0 ? (
                            <div className="empty-feedbacks">
                                <p>아직 피드백이 없습니다.</p>
                                <p>첫 번째 피드백을 작성해보세요! 💭</p>
                            </div>
                        ) : (
                            <>
                                <div className="feedbacks-list">
                                    {paginatedFeedbacks.map(feedback => {
                                        const typeInfo = getTypeInfo(feedback.type);
                                        const statusInfo = getStatusStyle(feedback.status);
                                        const priorityInfo = getPriorityStyle(feedback.priority);
                                        const isOwnFeedback = feedback.userId === currentUser._id;

                                        return (
                                            <div key={feedback._id} className="feedback-item">
                                                <div className="feedback-header">
                                                    <div className="feedback-title">
                                                        <span className="feedback-type">
                                                            {typeInfo.emoji} {typeInfo.label}
                                                        </span>
                                                        <h4>{feedback.title}</h4>
                                                        {isOwnFeedback && <span className="own-feedback-badge">내 피드백</span>}
                                                        {feedback.adminReply && feedback.adminReply.content && (
                                                            <span className="has-reply-badge">💬 답변있음</span>
                                                        )}
                                                    </div>
                                                    <div className="feedback-meta">
                                                        <span className={`feedback-status ${statusInfo.class}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                        <span className={`feedback-priority ${priorityInfo.class}`}>
                                                            {priorityInfo.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="feedback-content">
                                                    {feedback.content}
                                                </div>
                                                
                                                <div className="feedback-footer">
                                                    <div className="feedback-author">
                                                        <strong>{feedback.userName}</strong>
                                                        <span className="feedback-date">
                                                            {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="feedback-actions">
                                                        {isOwnFeedback && (
                                                            <button
                                                                className="delete-feedback-btn"
                                                                onClick={() => showModal('confirm', '피드백 삭제', '내 피드백을 삭제하시겠습니까?', () => deleteFeedback(feedback._id))}
                                                                disabled={loading}
                                                            >
                                                                🗑️ 삭제
                                                            </button>
                                                        )}
                                                        
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    className="edit-feedback-btn"
                                                                    onClick={() => startEditFeedback(feedback)}
                                                                    disabled={loading || editingFeedback === feedback._id}
                                                                >
                                                                    ⚙️ 관리
                                                                </button>
                                                                <button
                                                                    className="delete-feedback-btn admin"
                                                                    onClick={() => showModal('confirm', '피드백 삭제', '이 피드백을 삭제하시겠습니까?', () => deleteFeedback(feedback._id))}
                                                                    disabled={loading}
                                                                >
                                                                    🗑️ 삭제
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 관리자 답변 */}
                                                {feedback.adminReply && feedback.adminReply.content && (
                                                    <div className="admin-reply">
                                                        <div className="admin-reply-header">
                                                            <strong>👑 관리자 답변</strong>
                                                            <span className="reply-date">
                                                                {new Date(feedback.adminReply.repliedAt).toLocaleDateString('ko-KR')}
                                                            </span>
                                                            {isOwnFeedback && <span className="new-reply-badge">📢 새 답변</span>}
                                                        </div>
                                                        <div className="admin-reply-content">
                                                            {feedback.adminReply.content}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 관리자 편집 폼 */}
                                                {isAdmin && editingFeedback === feedback._id && (
                                                    <div className="admin-edit-form">
                                                        <h4>👑 관리자 관리</h4>
                                                        
                                                        <div className="form-group">
                                                            <label>상태 변경</label>
                                                            <select
                                                                value={newStatus}
                                                                onChange={(e) => setNewStatus(e.target.value)}
                                                                disabled={loading}
                                                            >
                                                                <option value="pending">대기중</option>
                                                                <option value="in_progress">진행중</option>
                                                                <option value="completed">완료</option>
                                                                <option value="rejected">거절됨</option>
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label>관리자 답변</label>
                                                            <textarea
                                                                value={adminReply}
                                                                onChange={(e) => setAdminReply(e.target.value)}
                                                                placeholder="사용자에게 답변을 입력해주세요..."
                                                                rows="4"
                                                                maxLength="1000"
                                                                disabled={loading}
                                                            />
                                                            <small>{adminReply.length}/1000</small>
                                                        </div>

                                                        <div className="admin-edit-actions">
                                                            <button
                                                                className="save-admin-edit-btn"
                                                                onClick={() => updateFeedbackStatus(feedback._id, newStatus, adminReply)}
                                                                disabled={loading || !newStatus}
                                                            >
                                                                {loading ? '저장 중...' : '💾 저장'}
                                                            </button>
                                                            <button
                                                                className="cancel-admin-edit-btn"
                                                                onClick={cancelEditFeedback}
                                                                disabled={loading}
                                                            >
                                                                ❌ 취소
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                        
                                        <div className="page-numbers">
                                            {(() => {
                                                const pages = [];
                                                const startPage = Math.max(1, currentPage - 2);
                                                const endPage = Math.min(totalPages, currentPage + 2);
                                                
                                                for (let i = startPage; i <= endPage; i++) {
                                                    pages.push(
                                                        <button
                                                            key={i}
                                                            className={`page-number ${i === currentPage ? 'active' : ''}`}
                                                            onClick={() => setCurrentPage(i)}
                                                        >
                                                            {i}
                                                        </button>
                                                    );
                                                }
                                                return pages;
                                            })()}
                                        </div>
                                        
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            다음
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Modal />
        </>
    );
}
