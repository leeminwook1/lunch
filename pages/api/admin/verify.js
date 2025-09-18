import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed'
        });
    }

    await connectDB();

    try {
        const { userId, adminCode } = req.body;

        if (!userId || !adminCode) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID와 관리자 코드가 필요합니다'
            });
        }

        // 관리자 코드 확인 (환경변수에서 가져오거나 하드코딩)
        const ADMIN_CODE = process.env.ADMIN_CODE || 'lunch2025admin';
        
        if (adminCode !== ADMIN_CODE) {
            return res.status(401).json({
                success: false,
                message: '잘못된 관리자 코드입니다'
            });
        }

        // 사용자를 관리자로 승격
        const user = await User.findByIdAndUpdate(
            userId,
            { role: 'admin' },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다'
            });
        }

        res.status(200).json({
            success: true,
            message: '관리자 권한이 부여되었습니다',
            data: {
                userId: user._id,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '관리자 인증에 실패했습니다',
            error: error.message
        });
    }
}