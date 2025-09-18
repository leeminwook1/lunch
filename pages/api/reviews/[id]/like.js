import connectDB from '../../../../lib/mongodb';
import Review from '../../../../models/Review';
import Restaurant from '../../../../models/Restaurant';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    await connectDB();

    const { id } = req.query;

    // ObjectId 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: '유효하지 않은 리뷰 ID입니다'
        });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed'
        });
    }

    try {
        const { userId, userName } = req.body;

        if (!userId || !userName) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보가 필요합니다'
            });
        }

        const review = await Review.findById(id);

        if (!review || !review.isActive) {
            return res.status(404).json({
                success: false,
                message: '리뷰를 찾을 수 없습니다'
            });
        }

        // 이미 좋아요를 눌렀는지 확인
        const existingLikeIndex = review.likes.findIndex(
            like => like.userId.toString() === userId
        );

        let action;
        if (existingLikeIndex > -1) {
            // 좋아요 취소
            review.likes.splice(existingLikeIndex, 1);
            action = 'unliked';
        } else {
            // 좋아요 추가
            review.likes.push({
                userId,
                userName,
                likedAt: new Date()
            });
            action = 'liked';
        }

        review.likeCount = review.likes.length;
        await review.save();

        // 가게의 총 좋아요 수 업데이트
        const allReviews = await Review.find({
            restaurantId: review.restaurantId,
            isActive: true
        });
        const totalLikes = allReviews.reduce((sum, r) => sum + r.likeCount, 0);

        await Restaurant.findByIdAndUpdate(review.restaurantId, {
            totalLikes
        });

        res.status(200).json({
            success: true,
            data: {
                reviewId: review._id,
                likeCount: review.likeCount,
                action,
                isLiked: action === 'liked'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '좋아요 처리에 실패했습니다',
            error: error.message
        });
    }
}