import dbConnect from '../../../../lib/mongodb';
import Vote from '../../../../models/Vote';

export default async function handler(req, res) {
    await dbConnect();

    const { id } = req.query;

    if (req.method === 'POST') {
        try {
            const { userId, userName, candidateId } = req.body;

            if (!userId || !userName || !candidateId) {
                return res.status(400).json({
                    success: false,
                    message: '필수 정보를 모두 입력해주세요.'
                });
            }

            const vote = await Vote.findById(id);

            if (!vote) {
                return res.status(404).json({
                    success: false,
                    message: '투표를 찾을 수 없습니다.'
                });
            }

            // 투표 상태 확인
            if (vote.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: '종료된 투표입니다.'
                });
            }

            // 마감 시간 확인
            if (vote.endTime < new Date()) {
                vote.status = 'closed';
                await vote.save();
                return res.status(400).json({
                    success: false,
                    message: '투표가 마감되었습니다.'
                });
            }

            // 후보 찾기
            const candidate = vote.candidates.find(
                c => c.restaurantId.toString() === candidateId
            );

            if (!candidate) {
                return res.status(404).json({
                    success: false,
                    message: '후보를 찾을 수 없습니다.'
                });
            }

            // 이미 투표했는지 확인
            const hasVoted = vote.candidates.some(c =>
                c.votes.some(v => v.userId.toString() === userId)
            );

            if (hasVoted && !vote.allowMultipleVotes) {
                // 기존 투표 취소
                vote.candidates.forEach(c => {
                    const voteIndex = c.votes.findIndex(v => v.userId.toString() === userId);
                    if (voteIndex !== -1) {
                        c.votes.splice(voteIndex, 1);
                        c.voteCount = c.votes.length;
                    }
                });
            }

            // 같은 후보에 이미 투표했는지 확인
            const alreadyVotedForThis = candidate.votes.some(
                v => v.userId.toString() === userId
            );

            if (alreadyVotedForThis) {
                return res.status(400).json({
                    success: false,
                    message: '이미 이 후보에 투표하셨습니다.'
                });
            }

            // 투표 추가
            candidate.votes.push({
                userId,
                userName,
                votedAt: new Date()
            });
            candidate.voteCount = candidate.votes.length;

            // 전체 투표자 수 업데이트
            const uniqueVoters = new Set();
            vote.candidates.forEach(c => {
                c.votes.forEach(v => {
                    uniqueVoters.add(v.userId.toString());
                });
            });
            vote.totalVoters = uniqueVoters.size;

            await vote.save();

            res.status(200).json({
                success: true,
                data: vote,
                message: '투표가 완료되었습니다!'
            });
        } catch (error) {
            console.error('투표 실패:', error);
            res.status(500).json({
                success: false,
                message: '투표에 실패했습니다.'
            });
        }
    } else {
        res.status(405).json({
            success: false,
            message: '지원하지 않는 메서드입니다.'
        });
    }
}
