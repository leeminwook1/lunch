import connectDB from '../../../../lib/mongodb';
import Review from '../../../../models/Review';
import Restaurant from '../../../../models/Restaurant';
import User from '../../../../models/User';
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

    switch (req.method) {
        case 'GET':
            try {
                const review = await Review.findById(id)
                    .populate('restaurantId', 'name category image')
                    .populate('userId', 'name role');
                
                if (!review || !review.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '리뷰를 찾을 수 없습니다'
                    });
                }

                res.status(200).json({
                    success: true,
                    data: review
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '리뷰 정보를 가져오는데 실패했습니다',
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

                const review = await Review.findById(id);
                if (!review || !review.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '리뷰를 찾을 수 없습니다'
                    });
                }

                // 권한 확인: 관리자이거나 본인의 리뷰인 경우만 삭제 가능
                if (user.role !== 'admin' && review.userId.toString() !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: '리뷰를 삭제할 권한이 없습니다'
                    });
                }

                // 소프트 삭제
                review.isActive = false;
                review.updatedAt = new Date();
                await review.save();

                // 가게 평점 재계산
                await updateRestaurantRating(review.restaurantId);

                res.status(200).json({
                    success: true,
                    message: '리뷰가 삭제되었습니다'
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '리뷰 삭제에 실패했습니다',
                    error: error.message
                });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'DELETE']);
            res.status(405).json({
                success: false,
                message: `Method ${req.method} Not Allowed`
            });
    }
}

// 가게 평점 업데이트 함수
async function updateRestaurantRating(restaurantId) {
    const reviews = await Review.find({ restaurantId, isActive: true });
    
    if (reviews.length === 0) {
        await Restaurant.findByIdAndUpdate(restaurantId, {
            averageRating: 0,
            reviewCount: 0,
            totalLikes: 0
        });
        return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
    const totalLikes = reviews.reduce((sum, review) => sum + review.likeCount, 0);

    await Restaurant.findByIdAndUpdate(restaurantId, {
        averageRating,
        reviewCount: reviews.length,
        totalLikes
    });
}