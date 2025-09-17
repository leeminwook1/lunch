import connectDB from '../../../lib/mongodb';
import Visit from '../../../models/Visit';
import User from '../../../models/User';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const { userId, userName, limit = 50 } = req.query;

                let query = {};
                if (userId) query.userId = userId;
                if (userName) query.userName = userName;

                const visits = await Visit.find(query)
                    .populate('restaurantId', 'name category image distance')
                    .sort({ visitedAt: -1 })
                    .limit(parseInt(limit));

                res.status(200).json({
                    success: true,
                    data: visits,
                    count: visits.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '방문 기록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { userId, userName, restaurantId, visitType = 'random' } = req.body;

                if (!userId || !userName || !restaurantId) {
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

                const visit = await Visit.create({
                    userId,
                    userName,
                    restaurantId,
                    restaurantName: restaurant.name,
                    visitType
                });

                const populatedVisit = await Visit.findById(visit._id)
                    .populate('restaurantId', 'name category image distance');

                res.status(201).json({
                    success: true,
                    data: populatedVisit
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '방문 기록 추가에 실패했습니다',
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