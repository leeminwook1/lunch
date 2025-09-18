import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import Review from '../../../models/Review';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed'
        });
    }

    await connectDB();

    try {
        const { category, limit = 10, sortBy = 'rating' } = req.query;

        // 기본 쿼리
        let query = { isActive: true };
        if (category && category !== 'all') {
            query.category = category;
        }

        let sortOption = {};
        switch (sortBy) {
            case 'likes':
                sortOption = { totalLikes: -1, averageRating: -1, reviewCount: -1 };
                break;
            case 'reviews':
                sortOption = { reviewCount: -1, averageRating: -1, totalLikes: -1 };
                break;
            case 'rating':
            default:
                sortOption = { averageRating: -1, reviewCount: -1, totalLikes: -1 };
        }

        // 추천 가게 조회 (평점이나 리뷰가 있는 가게만)
        const recommendations = await Restaurant.find({
            ...query,
            $or: [
                { averageRating: { $gt: 0 } },
                { reviewCount: { $gt: 0 } },
                { totalLikes: { $gt: 0 } }
            ]
        })
        .sort(sortOption)
        .limit(parseInt(limit));

        // 카테고리별 통계
        const categoryStats = await Restaurant.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$averageRating' },
                    totalReviews: { $sum: '$reviewCount' },
                    totalLikes: { $sum: '$totalLikes' }
                }
            },
            { $sort: { avgRating: -1 } }
        ]);

        // 전체 통계
        const overallStats = await Restaurant.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalRestaurants: { $sum: 1 },
                    avgRating: { $avg: '$averageRating' },
                    totalReviews: { $sum: '$reviewCount' },
                    totalLikes: { $sum: '$totalLikes' },
                    restaurantsWithReviews: {
                        $sum: { $cond: [{ $gt: ['$reviewCount', 0] }, 1, 0] }
                    }
                }
            }
        ]);

        // 최근 인기 리뷰 (좋아요 많은 순)
        const popularReviews = await Review.find({ isActive: true })
            .populate('restaurantId', 'name category image')
            .sort({ likeCount: -1, createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                recommendations,
                categoryStats,
                overallStats: overallStats[0] || {
                    totalRestaurants: 0,
                    avgRating: 0,
                    totalReviews: 0,
                    totalLikes: 0,
                    restaurantsWithReviews: 0
                },
                popularReviews,
                filters: {
                    category: category || 'all',
                    sortBy,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '추천 데이터를 가져오는데 실패했습니다',
            error: error.message
        });
    }
}