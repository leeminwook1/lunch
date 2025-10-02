import { useState, useEffect, useCallback } from 'react';

export const useUser = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isUserNameSet, setIsUserNameSet] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // 사용자 이름 검증 상태
    const [nameCheckStatus, setNameCheckStatus] = useState('');
    const [nameCheckMessage, setNameCheckMessage] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    const apiCall = useCallback(async (endpoint, options = {}) => {
        try {
            const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                let errorMessage = '서버 오류가 발생했습니다.';
                
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (parseError) {
                    // JSON 파싱 실패 시 상태 코드에 따른 메시지
                    switch (response.status) {
                        case 401:
                            errorMessage = '인증에 실패했습니다.';
                            break;
                        case 403:
                            errorMessage = '접근 권한이 없습니다.';
                            break;
                        case 404:
                            errorMessage = '요청한 리소스를 찾을 수 없습니다.';
                            break;
                        case 500:
                            errorMessage = '서버 내부 오류가 발생했습니다.';
                            break;
                        default:
                            errorMessage = '네트워크 오류가 발생했습니다.';
                    }
                }
                
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            // 네트워크 오류인 경우 사용자 친화적 메시지로 변경
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('네트워크 연결을 확인해주세요.');
            }
            throw error;
        }
    }, []);

    const checkUserName = useCallback(async (name) => {
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
            setNameCheckStatus('available');
            setNameCheckMessage('이름 확인 중 오류가 발생했지만 계속 진행할 수 있습니다');
        }
    }, [apiCall]);

    const createOrLoginUser = useCallback(async (name, adminPassword = '') => {
        try {
            setLoading(true);
            
            const requestBody = { name: name.trim() };
            
            // 관리자 계정인 경우 비밀번호 포함
            if (name.trim() === '관리자') {
                if (!adminPassword || adminPassword.trim() === '') {
                    throw new Error('관리자 비밀번호를 입력해주세요.');
                }
                requestBody.adminPassword = adminPassword.trim();
            }

            const result = await apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            if (result.success) {
                setCurrentUser(result.data);
                setIsUserNameSet(true);
                setIsAdmin(result.data.role === 'admin');
                
                // 로컬 스토리지와 세션 스토리지에 저장
                localStorage.setItem('currentUserId', result.data._id);
                localStorage.setItem('currentUserName', result.data.name);
                sessionStorage.setItem('currentUserId', result.data._id);
                sessionStorage.setItem('currentUserName', result.data.name);
                sessionStorage.setItem('userRole', result.data.role || 'user');
                
                return result.data;
            } else {
                throw new Error(result.message || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('사용자 생성/로그인 실패:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [apiCall]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setIsUserNameSet(false);
        setIsAdmin(false);
        setNameCheckStatus('');
        setNameCheckMessage('');
        setShowAdminPassword(false);
        
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserName');
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('currentUserName');
        sessionStorage.removeItem('userRole');
    }, []);

    // 초기화 시 저장된 사용자 정보 복원
    useEffect(() => {
        const initializeUser = async () => {
            try {
                // 세션 스토리지 우선 확인, 없으면 로컬 스토리지 확인
                let savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
                let savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');
                let savedUserRole = sessionStorage.getItem('userRole');

                if (savedUserId && savedUserName) {
                    try {
                        // 세션에 역할 정보가 있으면 API 호출 없이 복원
                        if (savedUserRole) {
                            setCurrentUser({
                                _id: savedUserId,
                                name: savedUserName,
                                role: savedUserRole
                            });
                            setIsUserNameSet(true);
                            setIsAdmin(savedUserRole === 'admin');
                        } else {
                            // 세션에 역할 정보가 없으면 API 호출
                            const userResult = await apiCall('/api/users', {
                                method: 'POST',
                                body: JSON.stringify({ name: savedUserName })
                            });

                            if (userResult.success) {
                                setCurrentUser(userResult.data);
                                setIsUserNameSet(true);
                                setIsAdmin(userResult.data.role === 'admin');
                                // 세션에 역할 정보 저장
                                sessionStorage.setItem('userRole', userResult.data.role || 'user');
                            }
                        }
                    } catch (error) {
                        console.error('사용자 정보 복원 실패:', error);
                        // 실패 시 스토리지 정리
                        logout();
                    }
                }
            } finally {
                setIsInitializing(false);
            }
        };

        initializeUser();
    }, [apiCall, logout]);

    return {
        currentUser,
        isUserNameSet,
        isAdmin,
        loading,
        isInitializing,
        nameCheckStatus,
        nameCheckMessage,
        showAdminPassword,
        checkUserName,
        createOrLoginUser,
        logout,
        apiCall
    };
};