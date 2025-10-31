import dbConnect from '../../../../lib/mongodb';
import GameScore from '../../../../models/GameScore';

export default async function handler(req, res) {
    const { method, query: { userId } } = req;

    if (method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: '허용되지 않는 메소드입니다'
        });
    }

    await dbConnect();

    try {
        // 사용자의 최고 점수
        const bestScore = await GameScore.findOne({ user: userId })
            .sort({ score: -1 })
            .lean();

        // 사용자의 최근 점수 (최근 10개)
        const recentScores = await GameScore.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // 사용자의 순위 계산 (최고 점수 기준)
        let rank = null;
        if (bestScore) {
            const higherScores = await GameScore.countDocuments({
                score: { $gt: bestScore.score }
            });
            rank = higherScores + 1;
        }

        return res.status(200).json({
            success: true,
            data: {
                bestScore,
                recentScores,
                rank
            }
        });
    } catch (error) {
        console.error('사용자 점수 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: '사용자 점수 조회 중 오류가 발생했습니다'
        });
    }
}

