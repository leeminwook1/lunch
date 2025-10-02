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

    const { id } = req.query;

    if (!id) {
        return sendError(res, 400, '방문 기록 ID가 필요합니다');
    }

    switch (req.method) {
        case 'GET':
            try {
                const visit = await VisitCalendar.findById(id).select('-__v');
                
                if (!visit) {
                    return sendError(res, 404, '방문 기록을 찾을 수 없습니다');
                }

                return sendSuccess(res, visit);
            } catch (error) {
                console.error('방문 기록 조회 실패:', error);
                return sendError(res, 500, '방문 기록 조회에 실패했습니다', error);
            }

        case 'PUT':
            try {
                const { memo, rating } = req.body;

                const visit = await VisitCalendar.findByIdAndUpdate(
                    id,
                    {
                        ...(memo !== undefined && { memo }),
                        ...(rating !== undefined && { rating })
                    },
                    { new: true, runValidators: true }
                ).select('-__v');

                if (!visit) {
                    return sendError(res, 404, '방문 기록을 찾을 수 없습니다');
                }

                return sendSuccess(res, visit, '방문 기록이 수정되었습니다');
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(err => err.message);
                    return sendError(res, 400, messages.join(', '));
                }

                console.error('방문 기록 수정 실패:', error);
                return sendError(res, 500, '방문 기록 수정에 실패했습니다', error);
            }

        case 'DELETE':
            try {
                const visit = await VisitCalendar.findByIdAndDelete(id);
                
                if (!visit) {
                    return sendError(res, 404, '방문 기록을 찾을 수 없습니다');
                }

                return sendSuccess(res, null, '방문 기록이 삭제되었습니다');
            } catch (error) {
                console.error('방문 기록 삭제 실패:', error);
                return sendError(res, 500, '방문 기록 삭제에 실패했습니다', error);
            }

        default:
            return sendError(res, 405, `${req.method} 메서드는 지원되지 않습니다`);
    }
}

export default createApiHandler(handler, {
    methods: ['GET', 'PUT', 'DELETE'],
    rateLimit: true
});