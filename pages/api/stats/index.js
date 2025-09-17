import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import Visit from '../../../models/Visit';
import Selection from '../../../models/Selection';
import User from '../../../models/User';

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
        const { userId, userName } = req.query;

        // 전체 통계
        const [
            totalRestaurants,
            totalUsers,
            totalVisits,
            totalSelections,
            categoryStats,
            recentSelections
        ] = await Promise.all([
            Restaurant.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: true }),
            Visit.countDocuments(),
            Selection.countDocuments(),
            Restaurant.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Selection.find()
                .populate('restaurantId', 'name category image')
                .sort({ selectedAt: -1 })
                .limit(5)
        ]);

        let userStats = null;
        if (userId || userName) {
            const userQuery = userId ? { _id: userId } : { name: userName };
            const user = await User.findOne(userQuery);
            
            if (user) {
                const [userVisits, userVisitsByCategory, mostVisitedRestaurants] = await Promise.all([
                    Visit.countDocuments({ userId: user._id }),
                    Visit.aggregate([
                        { $match: { userId: user._id } },
                        { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
                        { $unwind: '$restaurant' },
                        { $group: { _id: '$restaurant.category', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]),
                    Visit.aggregate([
                        { $match: { userId: user._id } },
                        { $group: { _id: { restaurantId: '$restaurantId', restaurantName: '$restaurantName' }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 5 },
                        { $lookup: { from: 'restaurants', localField: '_id.restaurantId', foreignField: '_id', as: 'restaurant' } },
                        { $unwind: '$restaurant' }
                    ])
                ]);

                userStats = {
                    userId: user._id,
                    userName: user.name,
                    totalVisits: userVisits,
                    visitsByCategory: userVisitsByCategory,
                    mostVisitedRestaurants: mostVisitedRestaurants.map(item => ({
                        restaurant: item.restaurant,
                        visitCount: item.count
                    }))
                };
            }
        }

        // 인기 가게 (전체 방문 기준)
        const popularRestaurants = await Visit.aggregate([
            { $group: { _id: { restaurantId: '$restaurantId', restaurantName: '$restaurantName' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'restaurants', localField: '_id.restaurantId', foreignField: '_id', as: 'restaurant' } },
            { $unwind: '$restaurant' }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalRestaurants,
                    totalUsers,
                    totalVisits,
                    totalSelections
                },
                categoryStats,
                popularRestaurants: popularRestaurants.map(item => ({
                    restaurant: item.restaurant,
                    visitCount: item.count
                })),
                recentSelections,
                userStats
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '통계 데이터를 가져오는데 실패했습니다',
            error: error.message
        });
    }
}