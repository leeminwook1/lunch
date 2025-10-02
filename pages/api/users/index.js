import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const users = await User.find({ isActive: true })
                    .select('name email lastLoginAt createdAt')
                    .sort({ lastLoginAt: -1 });
                
                res.status(200).json({
                    success: true,
                    data: users
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '사용자 목록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { name, email, adminPassword } = req.body;

                if (!name || name.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: '사용자 이름은 필수입니다'
                    });
                }

                // 관리자 계정인 경우 비밀번호 검증
                if (name.trim() === '관리자') {
                    // 환경 변수에서 비밀번호 읽기, 없으면 기본값 사용
                    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
                    
                    // 디버그용 로그 (프로덕션에서는 제거)
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Admin login attempt - Expected:', correctPassword, 'Provided:', adminPassword);
                    }
                    
                    if (!adminPassword) {
                        return res.status(401).json({
                            success: false,
                            message: '관리자 비밀번호를 입력해주세요.'
                        });
                    }
                    
                    if (adminPassword.trim() !== correctPassword) {
                        return res.status(401).json({
                            success: false,
                            message: '관리자 비밀번호가 올바르지 않습니다.'
                        });
                    }
                }

                // 기존 사용자 확인
                let user = await User.findOne({ name: name.trim() });
                
                if (user) {
                    // 기존 사용자 로그인 시간 업데이트
                    user.lastLoginAt = new Date();
                    if (email) user.email = email;
                    
                    // "관리자" 이름인 경우 자동으로 관리자 권한 부여
                    if (name.trim() === '관리자') {
                        user.role = 'admin';
                    }
                    
                    await user.save();
                } else {
                    // 새 사용자 생성
                    const isAdmin = name.trim() === '관리자';
                    user = await User.create({
                        name: name.trim(),
                        email: email || undefined,
                        role: isAdmin ? 'admin' : 'user'
                    });
                }

                res.status(201).json({
                    success: true,
                    data: user
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '사용자 생성/로그인에 실패했습니다',
                    error: error.message
                });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).json({
                success: false,
                message: `Method ${req.method} Not Allowed`
            });
    }
}