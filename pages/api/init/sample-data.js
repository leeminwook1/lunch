import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import User from '../../../models/User';

const sampleRestaurants = [
    {
        name: '김밥천국',
        distance: '50m',
        category: '한식',
        image: 'https://images.unsplash.com/photo-1553978297-833d09932d31?w=400&h=300&fit=crop',
        description: '24시간 운영하는 김밥 전문점',
        createdBy: 'system'
    },
    {
        name: '맘스터치',
        distance: '120m',
        category: '양식',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
        description: '수제버거 전문점',
        createdBy: 'system'
    },
    {
        name: '중국집 홍루',
        distance: '200m',
        category: '중식',
        image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop',
        description: '전통 중화요리 전문점',
        createdBy: 'system'
    },
    {
        name: '한솥도시락',
        distance: '80m',
        category: '한식',
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
        description: '든든한 한식 도시락',
        createdBy: 'system'
    },
    {
        name: '스시로',
        distance: '300m',
        category: '일식',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
        description: '회전초밥 전문점',
        createdBy: 'system'
    },
    {
        name: '교촌치킨',
        distance: '150m',
        category: '치킨',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
        description: '허니콤보 치킨 전문점',
        createdBy: 'system'
    },
    {
        name: '떡볶이집',
        distance: '90m',
        category: '분식',
        image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=300&fit=crop',
        description: '매콤달콤 떡볶이',
        createdBy: 'system'
    },
    {
        name: '스타벅스',
        distance: '250m',
        category: '카페',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
        description: '커피와 디저트',
        createdBy: 'system'
    },
    {
        name: '백반집',
        distance: '180m',
        category: '한식',
        image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop',
        description: '집밥 같은 한식',
        createdBy: 'system'
    },
    {
        name: '파스타집',
        distance: '220m',
        category: '양식',
        image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
        description: '수제 파스타 전문점',
        createdBy: 'system'
    }
];

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
        const { resetAll = false } = req.body;

        if (resetAll) {
            // 모든 데이터 삭제 (개발용)
            await Promise.all([
                Restaurant.deleteMany({}),
                User.deleteMany({})
            ]);
        }

        // 시스템 사용자 생성
        let systemUser = await User.findOne({ name: 'system' });
        if (!systemUser) {
            systemUser = await User.create({
                name: 'system',
                email: 'system@lunch-picker.com'
            });
        }

        // 샘플 가게 데이터 추가 (중복 체크)
        const createdRestaurants = [];
        
        for (const restaurantData of sampleRestaurants) {
            const existing = await Restaurant.findOne({ 
                name: restaurantData.name,
                isActive: true 
            });
            
            if (!existing) {
                const restaurant = await Restaurant.create(restaurantData);
                createdRestaurants.push(restaurant);
            }
        }

        res.status(200).json({
            success: true,
            message: '샘플 데이터가 초기화되었습니다',
            data: {
                createdRestaurants: createdRestaurants.length,
                totalRestaurants: await Restaurant.countDocuments({ isActive: true }),
                systemUser: systemUser._id
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '샘플 데이터 초기화에 실패했습니다',
            error: error.message
        });
    }
}