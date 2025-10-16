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

        const { userId, userName, candidateDate, timeSlot } = req.body;

        // 입력 검증
        if (!userId || !userName) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보가 필요합니다.'
            });
        }

        if (!candidateDate || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: '날짜와 시간대를 선택해주세요.'
            });
        }

        const vote = await VoteDate.findById(id);

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
                message: '종료된 투표에는 투표할 수 없습니다.'
            });
        }

        // 마감 시간 확인
        if (new Date() > new Date(vote.endTime)) {
            return res.status(400).json({
                success: false,
                message: '투표 마감 시간이 지났습니다.'
            });
        }

        // 후보 날짜 찾기
        const candidate = vote.candidates.find(c => 
            new Date(c.date).toDateString() === new Date(candidateDate).toDateString()
        );

        if (!candidate) {
            return res.status(400).json({
                success: false,
                message: '선택한 날짜가 후보에 없습니다.'
            });
        }

        // 시간대 찾기
        const timeSlotObj = candidate.timeSlots.find(ts => 
            ts.startTime === timeSlot.startTime && ts.endTime === timeSlot.endTime
        );

        if (!timeSlotObj) {
            return res.status(400).json({
                success: false,
                message: '선택한 시간대가 후보에 없습니다.'
            });
        }

        // 기존 투표 확인
        const existingVote = timeSlotObj.votes.find(v => v.userId.toString() === userId);

        if (existingVote) {
            // 같은 시간대에서의 기존 투표 제거 (투표 취소)
            timeSlotObj.votes = timeSlotObj.votes.filter(v => v.userId.toString() !== userId);
            timeSlotObj.voteCount = timeSlotObj.votes.length;
            
            // 후보별 총 투표 수 업데이트
            candidate.totalVotes = candidate.timeSlots.reduce((sum, ts) => sum + ts.voteCount, 0);
            
            // 전체 투표자 수 업데이트
            const allVotes = vote.candidates.flatMap(c => c.timeSlots.flatMap(ts => ts.votes));
            const uniqueVoters = new Set(allVotes.map(v => v.userId.toString()));
            vote.totalVoters = uniqueVoters.size;

            await vote.save();

            return res.status(200).json({
                success: true,
                message: '투표가 취소되었습니다.',
                data: vote
            });
        }

        // 투표 변경 허용이 아닌 경우, 다른 시간대에서의 투표 제거
        if (!vote.allowMultipleVotes) {
            for (const cand of vote.candidates) {
                for (const ts of cand.timeSlots) {
                    if (ts !== timeSlotObj) { // 현재 시간대가 아닌 경우만
                        ts.votes = ts.votes.filter(v => v.userId.toString() !== userId);
                        ts.voteCount = ts.votes.length;
                    }
                }
                cand.totalVotes = cand.timeSlots.reduce((sum, ts) => sum + ts.voteCount, 0);
            }
        }

        // 새 투표 추가
        timeSlotObj.votes.push({
            userId,
            userName,
            votedAt: new Date()
        });
        timeSlotObj.voteCount = timeSlotObj.votes.length;

        // 후보별 총 투표수 업데이트
        candidate.totalVotes = candidate.timeSlots.reduce((sum, ts) => sum + ts.voteCount, 0);

        // 전체 투표자 수 업데이트
        const allVoters = new Set();
        vote.candidates.forEach(cand => {
            cand.timeSlots.forEach(ts => {
                ts.votes.forEach(v => allVoters.add(v.userId.toString()));
            });
        });
        vote.totalVoters = allVoters.size;

        await vote.save();

        return res.status(200).json({
            success: true,
            data: vote,
            message: '투표가 완료되었습니다.'
        });

    } catch (error) {
        console.error('투표하기 API 오류:', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
}
