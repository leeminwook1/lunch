import dbConnect from '../../../../lib/mongodb';
import VoteDate from '../../../../models/VoteDate';

export default async function handler(req, res) {
    try {
        await dbConnect();
        const { id } = req.query;

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                message: '허용되지 않는 HTTP 메서드입니다.'
            });
        }

        const { userId } = req.body;

        const vote = await VoteDate.findById(id);

        if (!vote) {
            return res.status(404).json({
                success: false,
                message: '투표를 찾을 수 없습니다.'
            });
        }

        // 생성자만 종료 가능
        if (vote.createdBy.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: '투표를 종료할 권한이 없습니다.'
            });
        }

        // 이미 종료된 투표인지 확인
        if (vote.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: '이미 종료된 투표입니다.'
            });
        }

        // 우승자 결정
        let maxVotes = 0;
        let winner = null;

        for (const candidate of vote.candidates) {
            for (const timeSlot of candidate.timeSlots) {
                if (timeSlot.voteCount > maxVotes) {
                    maxVotes = timeSlot.voteCount;
                    winner = {
                        date: candidate.date,
                        timeSlot: {
                            startTime: timeSlot.startTime,
                            endTime: timeSlot.endTime
                        },
                        voteCount: timeSlot.voteCount
                    };
                }
            }
        }

        // 투표 상태 업데이트
        vote.status = 'closed';
        vote.winner = winner;

        await vote.save();

        return res.status(200).json({
            success: true,
            data: vote,
            message: '투표가 종료되었습니다.'
        });

    } catch (error) {
        console.error('투표 종료 API 오류:', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
}
