import connectDB from '../../../lib/mongodb';
import Review from '../../../models/Review';
import Restaurant from '../../../models/Restaurant';
import User from '../../../models/User';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const { restaurantId, userId, limit = 20, sortBy = 'newest' } = req.query;
                
                let query = { isActive: true };
                if (restaurantId) query.restaurantId = restaurantId;
                if (userId) query.userId = userId;

                let sortOption = {};
                switch (sortBy) {
                    case 'likes':
                        sortOption = { likeCount: -1, createdAt: -1 };
                        break;
                    case 'rating':
                        sortOption = { rating: -1, createdAt: -1 };
                        break;
                    case 'newest':
                    default:
                        sortOption = { createdAt: -1 };
                }

                const reviews = await Review.find(query)
                    .populate('restaurantId', 'name category image')
                    .sort(sortOption)
                    .limit(parseInt(limit));

                res.status(200).json({
                    success: true,
                    data: reviews,
                    count: reviews.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '리뷰 목록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { userId, userName, restaurantId, rating, content } = req.body;

                if (!userId || !userName || !restaurantId || !rating || !content) {
                    return res.status(400).json({
                        success: false,
                        message: '필수 필드가 누락되었습니다'
                    });
                }

                // 사용자와 가게 존재 확인
                const [user, restaurant] = await Promise.all([
                    User.findById(userId),
                    Restaurant.findById(restaurantId)
                ]);

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다'
                    });
                }

                if (!restaurant || !restaurant.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '가게를 찾을 수 없습니다'
                    });
                }

                // 기존 리뷰 확인 (사용자당 가게별 하나의 리뷰만)
                const existingReview = await Review.findOne({ userId, restaurantId, isActive: true });
                
                let review;
                if (existingReview) {
                    // 기존 리뷰 업데이트
                    existingReview.rating = rating;
                    existingReview.content = content.trim();
                    existingReview.updatedAt = new Date();
                    review = await existingReview.save();
                } else {
                    // 새 리뷰 생성
                    review = await Review.create({
                        userId,
                        userName,
                        restaurantId,
                        restaurantName: restaurant.name,
                        rating,
                        content: content.trim()
                    });
                }

                // 가게 평점 업데이트
                await updateRestaurantRating(restaurantId);

                const populatedReview = await Review.findById(review._id)
                    .populate('restaurantId', 'name category image');

                res.status(201).json({
                    success: true,
                    data: populatedReview
                });
            } catch (error) {
                if (error.code === 11000) {
                    return res.status(400).json({
                        success: false,
                        message: '이미 이 가게에 리뷰를 작성하셨습니다'
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '리뷰 작성에 실패했습니다',
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

// 가게 평점 업데이트 함수
async function updateRestaurantRating(restaurantId) {
    const reviews = await Review.find({ restaurantId, isActive: true });
    
    if (reviews.length === 0) {
        await Restaurant.findByIdAndUpdate(restaurantId, {
            averageRating: 0,
            reviewCount: 0
        });
        return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10; // 소수점 1자리
    const totalLikes = reviews.reduce((sum, review) => sum + review.likeCount, 0);

    await Restaurant.findByIdAndUpdate(restaurantId, {
        averageRating,
        reviewCount: reviews.length,
        totalLikes
    });
}