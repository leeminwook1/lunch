import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import { createApiHandler, sendError, sendSuccess } from '../../../lib/apiHelpers';

async function handler(req, res) {
    try {
        await connectDB();
    } catch (error) {
        console.error('DB 연결 실패:', error);
        return res.status(500).json({
            success: false,
            message: 'DB 연결에 실패했습니다',
            error: error.message
        });
    }

    switch (req.method) {
        case 'GET':
            try {
                const { category, sortBy = 'name', search } = req.query;

                let query = { isActive: true };
                if (category && category !== 'all') {
                    query.category = category;
                }

                // 검색 기능 추가
                if (search && search.trim()) {
                    query.$or = [
                        { name: { $regex: search.trim(), $options: 'i' } },
                        { category: { $regex: search.trim(), $options: 'i' } },
                        { description: { $regex: search.trim(), $options: 'i' } }
                    ];
                }

                let sortOption = {};
                switch (sortBy) {
                    case 'distance':
                        sortOption = { distance: 1 };
                        break;
                    case 'newest':
                        sortOption = { createdAt: -1 };
                        break;
                    case 'name':
                    default:
                        sortOption = { name: 1 };
                }

                const restaurants = await Restaurant.find(query)
                    .sort(sortOption)
                    .select('-__v');

                res.status(200).json({
                    success: true,
                    data: restaurants,
                    count: restaurants.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '가게 목록을 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'POST':
            try {
                const { name, distance, category, image, description, websiteUrl, createdBy } = req.body;

                // 필수 필드 검증
                if (!name || !distance || !category || !image || !createdBy) {
                    return res.status(400).json({
                        success: false,
                        message: '필수 필드가 누락되었습니다'
                    });
                }

                // 중복 가게명 검증
                const existingRestaurant = await Restaurant.findOne({
                    name: name.trim(),
                    isActive: true
                });

                if (existingRestaurant) {
                    return res.status(400).json({
                        success: false,
                        message: '이미 존재하는 가게입니다'
                    });
                }

                const restaurant = await Restaurant.create({
                    name: name.trim(),
                    distance: distance.trim(),
                    category,
                    image: image.trim(),
                    description: description?.trim(),
                    websiteUrl: websiteUrl?.trim(),
                    createdBy
                });

                res.status(201).json({
                    success: true,
                    data: restaurant
                });
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(err => err.message);
                    return res.status(400).json({
                        success: false,
                        message: messages.join(', ')
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '가게 추가에 실패했습니다',
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

// 미들웨어 적용
export default createApiHandler(handler, {
    methods: ['GET', 'POST'],
    rateLimit: true,
    requiredFields: ['name', 'distance', 'category', 'image', 'createdBy'] // POST 요청에만 적용
});