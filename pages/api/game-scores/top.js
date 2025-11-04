import dbConnect from '../../../lib/mongodb';
import GameScore from '../../../models/GameScore';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: '허용되지 않는 메소드입니다'
        });
    }

    await dbConnect();

    try {
        const { limit = 10, gameType } = req.query;

        // 쿼리 필터 생성
        const filter = {};
        if (gameType) {
            filter.gameType = gameType;
        }

        // 상위 점수 가져오기
        const topScores = await GameScore.find(filter)
            .populate('user', 'name')
            .sort({ score: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        return res.status(200).json({
            success: true,
            data: topScores
        });
    } catch (error) {
        console.error('상위 점수 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: '상위 점수 조회 중 오류가 발생했습니다'
        });
    }
}

