import connectDB from '../../../lib/mongodb';
import UserPreference from '../../../models/UserPreference';
import User from '../../../models/User';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
    await connectDB();

    switch (req.method) {
        case 'GET':
            try {
                const { userId } = req.query;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: '사용자 ID가 필요합니다'
                    });
                }

                let preference = await UserPreference.findOne({ userId })
                    .populate('excludedRestaurants.restaurantId', 'name category image');

                if (!preference) {
                    // 기본 선호도 생성
                    const user = await User.findById(userId);
                    if (!user) {
                        return res.status(404).json({
                            success: false,
                            message: '사용자를 찾을 수 없습니다'
                        });
                    }

                    preference = await UserPreference.create({
                        userId,
                        userName: user.name,
                        excludedRestaurants: [],
                        preferences: {
                            excludeRecentVisits: false,
                            recentVisitDays: 7,
                            favoriteCategories: []
                        }
                    });
                }

                res.status(200).json({
                    success: true,
                    data: preference
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '선호도를 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'PUT':
            try {
                const { userId, preferences, excludedRestaurants } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: '사용자 ID가 필요합니다'
                    });
                }

                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다'
                    });
                }

                let preference = await UserPreference.findOne({ userId });

                if (!preference) {
                    preference = new UserPreference({
                        userId,
                        userName: user.name,
                        excludedRestaurants: excludedRestaurants || [],
                        preferences: preferences || {}
                    });
                } else {
                    if (preferences) {
                        preference.preferences = { ...preference.preferences, ...preferences };
                    }
                    if (excludedRestaurants !== undefined) {
                        preference.excludedRestaurants = excludedRestaurants;
                    }
                }

                await preference.save();

                const populatedPreference = await UserPreference.findById(preference._id)
                    .populate('excludedRestaurants.restaurantId', 'name category image');

                res.status(200).json({
                    success: true,
                    data: populatedPreference
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '선호도 업데이트에 실패했습니다',
                    error: error.message
                });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'PUT']);
            res.status(405).json({
                success: false,
                message: `Method ${req.method} Not Allowed`
            });
    }
}