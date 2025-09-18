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
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '사용자 이름은 필수입니다'
            });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: '사용자 이름은 2글자 이상이어야 합니다'
            });
        }

        if (name.trim().length > 20) {
            return res.status(400).json({
                success: false,
                message: '사용자 이름은 20글자를 초과할 수 없습니다'
            });
        }

        // 특수문자 체크 (한글, 영문, 숫자만 허용)
        const nameRegex = /^[가-힣a-zA-Z0-9\s]+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(400).json({
                success: false,
                message: '사용자 이름은 한글, 영문, 숫자만 사용할 수 있습니다'
            });
        }

        // 중복 체크
        const existingUser = await User.findOne({ 
            name: name.trim(),
            isActive: true 
        });

        if (existingUser) {
            return res.status(200).json({
                success: true,
                exists: true,
                message: '이미 존재하는 사용자입니다',
                data: {
                    _id: existingUser._id,
                    name: existingUser.name,
                    lastLoginAt: existingUser.lastLoginAt
                }
            });
        }

        res.status(200).json({
            success: true,
            exists: false,
            message: '사용 가능한 이름입니다'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '사용자 확인에 실패했습니다',
            error: error.message
        });
    }
}