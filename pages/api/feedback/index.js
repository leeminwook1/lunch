import connectDB from '../../../lib/mongodb';
import Feedback from '../../../models/Feedback';
import User from '../../../models/User';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const { userId, status, type, limit = 20 } = req.query;
                
                let query = { isActive: true };
                if (userId) query.userId = userId;
                if (status) query.status = status;
                if (type) query.type = type;

                const feedbacks = await Feedback.find(query)
                    .populate('userId', 'name role')
                    .sort({ createdAt: -1 })
                    .limit(parseInt(limit));

                res.status(200).json({
                    success: true,
                    data: feedbacks,
                    count: feedbacks.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '피드백 목록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { userId, userName, type, title, content, priority } = req.body;

                if (!userId || !userName || !type || !title || !content) {
                    return res.status(400).json({
                        success: false,
                        message: '필수 필드가 누락되었습니다'
                    });
                }

                // 사용자 존재 확인
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다'
                    });
                }

                const feedback = await Feedback.create({
                    userId,
                    userName,
                    type,
                    title: title.trim(),
                    content: content.trim(),
                    priority: priority || 'medium'
                });

                const populatedFeedback = await Feedback.findById(feedback._id)
                    .populate('userId', 'name role');

                res.status(201).json({
                    success: true,
                    data: populatedFeedback,
                    message: '피드백이 성공적으로 제출되었습니다'
                });
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(err => err.message);
                    return res.status(400).json({
                        success: false,
                        message: messages.join(', ')
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '피드백 제출에 실패했습니다',
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
