import connectDB from '../../../lib/mongodb';
import UserPreference from '../../../models/UserPreference';
import User from '../../../models/User';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed'
        });
    }

    await connectDB();

    try {
        const { userId, restaurantId, action, reason } = req.body;

        if (!userId || !restaurantId || !action) {
            return res.status(400).json({
                success: false,
                message: '필수 필드가 누락되었습니다'
            });
        }

        if (!['exclude', 'include'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'action은 exclude 또는 include여야 합니다'
            });
        }

        // 사용자와 가게 확인
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

        // 사용자 선호도 가져오기 또는 생성
        let preference = await UserPreference.findOne({ userId });

        if (!preference) {
            preference = new UserPreference({
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

        if (action === 'exclude') {
            // 이미 제외된 가게인지 확인
            const isAlreadyExcluded = preference.excludedRestaurants.some(
                excluded => excluded.restaurantId.toString() === restaurantId
            );

            if (isAlreadyExcluded) {
                return res.status(400).json({
                    success: false,
                    message: '이미 제외된 가게입니다'
                });
            }

            // 가게 제외 추가
            preference.excludedRestaurants.push({
                restaurantId,
                restaurantName: restaurant.name,
                excludedAt: new Date(),
                reason: reason || '사용자 선택'
            });

        } else if (action === 'include') {
            // 제외 목록에서 제거
            preference.excludedRestaurants = preference.excludedRestaurants.filter(
                excluded => excluded.restaurantId.toString() !== restaurantId
            );
        }

        await preference.save();

        const populatedPreference = await UserPreference.findById(preference._id)
            .populate('excludedRestaurants.restaurantId', 'name category image');

        res.status(200).json({
            success: true,
            message: action === 'exclude' ? '가게가 제외되었습니다' : '가게 제외가 해제되었습니다',
            data: populatedPreference
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '가게 제외/포함 처리에 실패했습니다',
            error: error.message
        });
    }
}