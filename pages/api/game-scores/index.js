import dbConnect from '../../../lib/mongodb';
import GameScore from '../../../models/GameScore';
import User from '../../../models/User';

export default async function handler(req, res) {
    const { method } = req;

    await dbConnect();

    try {
        switch (method) {
            case 'GET':
                try {
                    // 상위 100개 점수 가져오기
                    const scores = await GameScore.find()
                        .populate('user', 'name')
                        .sort({ score: -1, createdAt: -1 })
                        .limit(100)
                        .lean();

                    return res.status(200).json({
                        success: true,
                        data: scores
                    });
                } catch (error) {
                    console.error('게임 점수 조회 실패:', error);
                    return res.status(500).json({
                        success: false,
                        error: '게임 점수 조회 중 오류가 발생했습니다'
                    });
                }

            case 'POST':
                try {
                    const { userId, nickname, score } = req.body;

                    // 유효성 검사
                    if (!userId || !nickname || score === undefined) {
                        return res.status(400).json({
                            success: false,
                            error: '필수 정보가 누락되었습니다'
                        });
                    }

                    if (score < 0) {
                        return res.status(400).json({
                            success: false,
                            error: '유효하지 않은 점수입니다'
                        });
                    }

                    // 사용자 확인
                    const user = await User.findById(userId);
                    if (!user) {
                        return res.status(404).json({
                            success: false,
                            error: '사용자를 찾을 수 없습니다'
                        });
                    }

                    // 게임 점수 생성
                    const gameScore = await GameScore.create({
                        user: userId,
                        nickname,
                        score,
                        gameType: 'runner'
                    });

                    // populate하여 반환
                    const populatedScore = await GameScore.findById(gameScore._id)
                        .populate('user', 'name')
                        .lean();

                    return res.status(201).json({
                        success: true,
                        data: populatedScore
                    });
                } catch (error) {
                    console.error('게임 점수 저장 실패:', error);
                    return res.status(500).json({
                        success: false,
                        error: '게임 점수 저장 중 오류가 발생했습니다'
                    });
                }

            default:
                return res.status(405).json({
                    success: false,
                    error: '허용되지 않는 메소드입니다'
                });
        }
    } catch (error) {
        console.error('API 오류:', error);
        return res.status(500).json({
            success: false,
            error: '서버 오류가 발생했습니다'
        });
    }
}

