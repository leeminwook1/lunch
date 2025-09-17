import connectDB from '../../../lib/mongodb';
import Selection from '../../../models/Selection';
import User from '../../../models/User';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const { limit = 10 } = req.query;

                const selections = await Selection.find()
                    .populate('restaurantId', 'name category image distance')
                    .sort({ selectedAt: -1 })
                    .limit(parseInt(limit));

                res.status(200).json({
                    success: true,
                    data: selections,
                    count: selections.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '선택 기록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { userId, userName, restaurantId, selectionType = 'random' } = req.body;

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

                const selection = await Selection.create({
                    userId,
                    userName,
                    restaurantId,
                    restaurantName: restaurant.name,
                    restaurantImage: restaurant.image,
                    selectionType
                });

                const populatedSelection = await Selection.findById(selection._id)
                    .populate('restaurantId', 'name category image distance');

                res.status(201).json({
                    success: true,
                    data: populatedSelection
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '선택 기록 추가에 실패했습니다',
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