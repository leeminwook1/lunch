import connectDB from '../../../lib/mongodb';
import Feedback from '../../../models/Feedback';
import User from '../../../models/User';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    await connectDB();

    const { id } = req.query;

    // ObjectId 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: '유효하지 않은 피드백 ID입니다'
        });
    }

    switch (req.method) {
        case 'GET':
            try {
                const feedback = await Feedback.findById(id)
                    .populate('userId', 'name role');
                
                if (!feedback || !feedback.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '피드백을 찾을 수 없습니다'
                    });
                }

                res.status(200).json({
                    success: true,
                    data: feedback
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '피드백 정보를 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'PUT':
            try {
                const { userId, status, adminReplyContent } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: '사용자 ID가 필요합니다'
                    });
                }

                // 사용자 권한 확인
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다'
                    });
                }

                const feedback = await Feedback.findById(id);
                if (!feedback || !feedback.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '피드백을 찾을 수 없습니다'
                    });
                }

                // 관리자만 상태 변경 및 답변 가능
                if (user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: '관리자만 피드백을 관리할 수 있습니다'
                    });
                }

                const updateData = { updatedAt: new Date() };
                
                if (status) {
                    updateData.status = status;
                }

                // 관리자 답변 처리
                if (adminReplyContent !== undefined && adminReplyContent.trim()) {
                    updateData.adminReply = {
                        content: adminReplyContent.trim(),
                        repliedAt: new Date(),
                        repliedBy: userId
                    };
                }

                console.log('업데이트 데이터:', updateData);

                const updatedFeedback = await Feedback.findByIdAndUpdate(
                    id,
                    updateData,
                    { new: true, runValidators: true }
                ).populate('userId', 'name role');

                console.log('업데이트된 피드백:', updatedFeedback);

                res.status(200).json({
                    success: true,
                    data: updatedFeedback,
                    message: '피드백이 업데이트되었습니다'
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
                    message: '피드백 업데이트에 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'DELETE':
            try {
                const { userId } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: '사용자 ID가 필요합니다'
                    });
                }

                // 사용자 권한 확인
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다'
                    });
                }

                const feedback = await Feedback.findById(id);
                if (!feedback || !feedback.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '피드백을 찾을 수 없습니다'
                    });
                }

                // 관리자이거나 본인의 피드백인 경우만 삭제 가능
                if (user.role !== 'admin' && feedback.userId.toString() !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: '본인의 피드백만 삭제할 수 있습니다'
                    });
                }

                // 소프트 삭제 (isActive를 false로 변경)
                await Feedback.findByIdAndUpdate(id, { 
                    isActive: false, 
                    updatedAt: new Date() 
                });

                res.status(200).json({
                    success: true,
                    message: '피드백이 삭제되었습니다'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '피드백 삭제에 실패했습니다',
                    error: error.message
                });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
            res.status(405).json({
                success: false,
                message: `Method ${req.method} Not Allowed`
            });
    }
}
