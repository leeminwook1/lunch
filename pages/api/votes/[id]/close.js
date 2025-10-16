import dbConnect from '../../../../lib/mongodb';
import Vote from '../../../../models/Vote';

export default async function handler(req, res) {
    await dbConnect();

    const { id } = req.query;

    if (req.method === 'POST') {
        try {
            const { userId } = req.body;

            const vote = await Vote.findById(id);

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

            if (vote.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: '이미 종료된 투표입니다.'
                });
            }

            // 투표 종료
            vote.status = 'closed';

            // 우승자 결정
            let maxVotes = 0;
            let winner = null;
            
            for (const candidate of vote.candidates) {
                if (candidate.voteCount > maxVotes) {
                    maxVotes = candidate.voteCount;
                    winner = {
                        restaurantId: candidate.restaurantId,
                        restaurantName: candidate.restaurantName,
                        voteCount: candidate.voteCount
                    };
                }
            }
            
            if (winner) {
                vote.winner = winner;
            }

            await vote.save();

            res.status(200).json({
                success: true,
                data: vote,
                message: '투표가 종료되었습니다!'
            });
        } catch (error) {
            console.error('투표 종료 실패:', error);
            res.status(500).json({
                success: false,
                message: '투표 종료에 실패했습니다.'
            });
        }
    } else {
        res.status(405).json({
            success: false,
            message: '지원하지 않는 메서드입니다.'
        });
    }
}
