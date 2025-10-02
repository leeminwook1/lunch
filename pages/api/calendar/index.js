import connectDB from '../../../lib/mongodb';
import VisitCalendar from '../../../models/VisitCalendar';
import { createApiHandler, sendError, sendSuccess } from '../../../lib/apiHelpers';

async function handler(req, res) {
    try {
        await connectDB();
    } catch (error) {
        console.error('DB 연결 실패:', error);
        return sendError(res, 500, 'DB 연결에 실패했습니다');
    }

    switch (req.method) {
        case 'GET':
            try {
                const { userId, year, month } = req.query;
                
                if (!userId) {
                    return sendError(res, 400, '사용자 ID가 필요합니다');
                }

                let query = { userId };
                
                // 년/월이 지정된 경우 해당 월의 데이터만 조회
                if (year && month) {
                    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
                    
                    query.visitDate = {
                        $gte: startDate,
                        $lte: endDate
                    };
                }

                const visits = await VisitCalendar.find(query)
                    .sort({ visitDate: -1 })
                    .select('-__v');

                return sendSuccess(res, visits);
            } catch (error) {
                console.error('방문 기록 조회 실패:', error);
                return sendError(res, 500, '방문 기록 조회에 실패했습니다', error);
            }

        case 'POST':
            try {
                const {
                    userId,
                    userName,
                    restaurantId,
                    restaurantName,
                    restaurantCategory,
                    restaurantImage,
                    visitDate,
                    memo,
                    rating,
                    visitType
                } = req.body;

                // 필수 필드 검증
                if (!userId || !userName || !restaurantId || !restaurantName || !visitDate) {
                    return sendError(res, 400, '필수 필드가 누락되었습니다');
                }

                // 같은 날짜에 같은 가게 방문 기록이 있는지 확인
                const existingVisit = await VisitCalendar.findOne({
                    userId,
                    restaurantId,
                    visitDate: {
                        $gte: new Date(visitDate),
                        $lt: new Date(new Date(visitDate).getTime() + 24 * 60 * 60 * 1000)
                    }
                });

                if (existingVisit) {
                    return sendError(res, 400, '같은 날짜에 이미 해당 가게 방문 기록이 있습니다');
                }

                const visit = await VisitCalendar.create({
                    userId,
                    userName,
                    restaurantId,
                    restaurantName,
                    restaurantCategory,
                    restaurantImage,
                    visitDate: new Date(visitDate),
                    memo: memo || '',
                    rating: rating || null,
                    visitType: visitType || 'manual'
                });

                return sendSuccess(res, visit, '방문 기록이 추가되었습니다', 201);
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(err => err.message);
                    return sendError(res, 400, messages.join(', '));
                }

                console.error('방문 기록 추가 실패:', error);
                return sendError(res, 500, '방문 기록 추가에 실패했습니다', error);
            }

        default:
            return sendError(res, 405, `${req.method} 메서드는 지원되지 않습니다`);
    }
}

export default createApiHandler(handler, {
    methods: ['GET', 'POST'],
    rateLimit: true
});