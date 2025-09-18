import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import Visit from '../../../models/Visit';
import Selection from '../../../models/Selection';
import UserPreference from '../../../models/UserPreference';

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
        const { 
            userId, 
            userName, 
            category, 
            excludeRecent = false,
            recentDays = 7 
        } = req.body;

        if (!userId || !userName) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보가 필요합니다'
            });
        }

        // 기본 쿼리 (활성화된 가게만)
        let query = { isActive: true };
        
        // 카테고리 필터
        if (category && category !== 'all') {
            query.category = category;
        }

        let availableRestaurants = await Restaurant.find(query);

        if (availableRestaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: '선택 가능한 가게가 없습니다'
            });
        }

        // 사용자 선호도 가져오기
        const userPreference = await UserPreference.findOne({ userId });
        
        // 사용자가 제외한 가게들 필터링
        if (userPreference && userPreference.excludedRestaurants.length > 0) {
            const excludedIds = userPreference.excludedRestaurants.map(
                excluded => excluded.restaurantId.toString()
            );
            
            availableRestaurants = availableRestaurants.filter(
                restaurant => !excludedIds.includes(restaurant._id.toString())
            );
        }

        // 최근 방문한 가게 제외 옵션 (사용자 선호도 또는 파라미터)
        const shouldExcludeRecent = userPreference?.preferences?.excludeRecentVisits || excludeRecent;
        const daysToExclude = userPreference?.preferences?.recentVisitDays || recentDays;

        if (shouldExcludeRecent) {
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - daysToExclude);

            const recentVisits = await Visit.find({
                userId,
                visitedAt: { $gte: recentDate }
            }).distinct('restaurantId');

            if (recentVisits.length > 0) {
                availableRestaurants = availableRestaurants.filter(
                    restaurant => !recentVisits.some(
                        visitId => visitId.toString() === restaurant._id.toString()
                    )
                );
            }
        }

        // 필터링 후에도 가게가 있는지 확인
        if (availableRestaurants.length === 0) {
            // 최근 방문 제외 조건을 무시하고 다시 시도
            availableRestaurants = await Restaurant.find(query);
        }

        // 랜덤 선택
        const randomIndex = Math.floor(Math.random() * availableRestaurants.length);
        const selectedRestaurant = availableRestaurants[randomIndex];

        // 방문 기록 추가
        const visit = await Visit.create({
            userId,
            userName,
            restaurantId: selectedRestaurant._id,
            restaurantName: selectedRestaurant.name,
            visitType: 'random'
        });

        // 선택 기록 추가
        const selection = await Selection.create({
            userId,
            userName,
            restaurantId: selectedRestaurant._id,
            restaurantName: selectedRestaurant.name,
            restaurantImage: selectedRestaurant.image,
            selectionType: 'random'
        });

        res.status(200).json({
            success: true,
            data: {
                restaurant: selectedRestaurant,
                visit,
                selection,
                totalAvailable: availableRestaurants.length,
                filters: {
                    category: category || 'all',
                    excludeRecent,
                    recentDays
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '랜덤 선택에 실패했습니다',
            error: error.message
        });
    }
}