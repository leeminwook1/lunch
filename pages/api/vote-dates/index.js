import dbConnect from '../../../lib/mongodb';
import VoteDate from '../../../models/VoteDate';

export default async function handler(req, res) {
    try {
        await dbConnect();

        if (req.method === 'GET') {
            // 투표 목록 조회
            const votes = await VoteDate.find()
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                data: votes
            });

        } else if (req.method === 'POST') {
            // 새 투표 생성
            const { title, description, candidates, allowMultipleVotes, endTime, userId, userName } = req.body;

            // 입력 검증
            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '투표 제목은 필수입니다.'
                });
            }

            if (!candidates || candidates.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: '최소 2개 이상의 날짜를 선택해주세요.'
                });
            }

            if (!endTime) {
                return res.status(400).json({
                    success: false,
                    message: '마감 시간을 설정해주세요.'
                });
            }

            const endDateTime = new Date(endTime);
            if (endDateTime <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: '마감 시간은 현재 시간보다 미래여야 합니다.'
                });
            }

            // 후보 날짜 검증
            for (const candidate of candidates) {
                if (!candidate.date) {
                    return res.status(400).json({
                        success: false,
                        message: '모든 후보에 날짜를 설정해주세요.'
                    });
                }

                if (!candidate.timeSlots || candidate.timeSlots.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: '각 날짜에 최소 1개 이상의 시간대를 설정해주세요.'
                    });
                }

                // 시간대 검증
                for (const timeSlot of candidate.timeSlots) {
                    if (!timeSlot.startTime || !timeSlot.endTime) {
                        return res.status(400).json({
                            success: false,
                            message: '모든 시간대에 시작시간과 종료시간을 설정해주세요.'
                        });
                    }
                }
            }

            // 투표 생성
            const newVote = new VoteDate({
                title: title.trim(),
                description: description?.trim() || '',
                createdBy: {
                    userId,
                    userName
                },
                candidates: candidates.map(candidate => ({
                    date: new Date(candidate.date),
                    timeSlots: candidate.timeSlots.map(timeSlot => ({
                        startTime: timeSlot.startTime,
                        endTime: timeSlot.endTime,
                        votes: [],
                        voteCount: 0
                    })),
                    totalVotes: 0
                })),
                allowMultipleVotes: allowMultipleVotes || false,
                endTime: endDateTime,
                totalVoters: 0
            });

            await newVote.save();

            return res.status(201).json({
                success: true,
                data: newVote,
                message: '투표가 생성되었습니다.'
            });

        } else {
            return res.status(405).json({
                success: false,
                message: '허용되지 않는 HTTP 메서드입니다.'
            });
        }

    } catch (error) {
        console.error('투표 API 오류:', error);
        return res.status(500).json({
            success: false,
            message: `서버 오류가 발생했습니다: ${error.message}`
        });
    }
}
