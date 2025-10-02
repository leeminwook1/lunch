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
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
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
                
                // 로컬 스토리지에 저장
                localStorage.setItem('currentUserId', result.data._id);
                localStorage.setItem('currentUserName', result.data.name);
                
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
    }, []);

    // 초기화 시 저장된 사용자 정보 복원
    useEffect(() => {
        const initializeUser = async () => {
            try {
                const savedUserId = localStorage.getItem('currentUserId');
                const savedUserName = localStorage.getItem('currentUserName');

                if (savedUserId && savedUserName) {
                    try {
                        const userResult = await apiCall('/api/users', {
                            method: 'POST',
                            body: JSON.stringify({ name: savedUserName })
                        });

                        if (userResult.success) {
                            setCurrentUser(userResult.data);
                            setIsUserNameSet(true);
                            setIsAdmin(userResult.data.role === 'admin');
                        }
                    } catch (error) {
                        console.error('사용자 정보 복원 실패:', error);
                        // 실패 시 로컬 스토리지 정리
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