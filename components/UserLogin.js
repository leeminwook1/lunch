import { useState, useEffect } from 'react';

const UserLogin = ({ 
    userName, 
    setUserName, 
    nameCheckStatus, 
    nameCheckMessage, 
    showAdminPassword, 
    adminPassword, 
    setAdminPassword, 
    onCheckUserName, 
    onSetUserName 
}) => {
    const [localUserName, setLocalUserName] = useState(userName);
    const [localAdminPassword, setLocalAdminPassword] = useState(adminPassword);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (localUserName.trim() && localUserName !== userName) {
                onCheckUserName(localUserName.trim());
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [localUserName, userName, onCheckUserName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (showAdminPassword) {
            setAdminPassword(localAdminPassword);
            // 관리자인 경우 비밀번호도 함께 전달
            onSetUserName(localUserName.trim(), localAdminPassword);
        } else {
            onSetUserName(localUserName.trim());
        }
    };

    const getStatusColor = () => {
        switch (nameCheckStatus) {
            case 'checking': return '#f59e0b';
            case 'available': return '#22c55e';
            case 'exists': return '#3b82f6';
            case 'invalid': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div className="user-login-container">
            <div className="user-login-card">
                <div className="login-header">
                    <h2>🍽️ 점심메뉴 선택기</h2>
                    <p>사용자 이름을 입력하여 시작하세요</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label htmlFor="userName">사용자 이름</label>
                        <input
                            id="userName"
                            type="text"
                            value={localUserName}
                            onChange={(e) => setLocalUserName(e.target.value)}
                            placeholder="이름을 입력하세요"
                            className="user-input"
                            autoFocus
                            required
                            minLength={2}
                            maxLength={30}
                        />
                        
                        {nameCheckMessage && (
                            <div 
                                className="name-check-message"
                                style={{ color: getStatusColor() }}
                            >
                                {nameCheckStatus === 'checking' && '⏳ '}
                                {nameCheckStatus === 'available' && '✅ '}
                                {nameCheckStatus === 'exists' && 'ℹ️ '}
                                {nameCheckStatus === 'invalid' && '❌ '}
                                {nameCheckMessage}
                            </div>
                        )}
                    </div>

                    {showAdminPassword && (
                        <div className="input-group">
                            <label htmlFor="adminPassword">관리자 비밀번호</label>
                            <input
                                id="adminPassword"
                                type="password"
                                value={localAdminPassword}
                                onChange={(e) => setLocalAdminPassword(e.target.value)}
                                placeholder="관리자 비밀번호를 입력하세요"
                                className="user-input"
                                required
                            />
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="login-btn"
                        disabled={nameCheckStatus === 'checking' || nameCheckStatus === 'invalid'}
                    >
                        {nameCheckStatus === 'exists' ? '로그인' : '시작하기'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>💡 관리자 계정으로 로그인하면 가게 관리가 가능합니다</p>
                </div>
            </div>
        </div>
    );
};

export default UserLogin;