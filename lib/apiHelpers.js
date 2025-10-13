// 간단한 API 헬퍼 함수들

// 에러 응답 헬퍼
export function sendError(res, status, message, error = null) {
    return res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && error && { error: error.message })
    });
}

// 성공 응답 헬퍼
export function sendSuccess(res, data, message = null, status = 200) {
    return res.status(status).json({
        success: true,
        ...(message && { message }),
        ...(data && { data })
    });
}

// HTTP 메서드 검증
export function validateMethod(req, res, allowedMethods) {
    if (!allowedMethods.includes(req.method)) {
        return sendError(res, 405, `${req.method} 메서드는 지원되지 않습니다.`);
    }
    return true;
}

// 필수 필드 검증
export function validateRequiredFields(req, res, fields) {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
        return sendError(res, 400, `필수 필드가 누락되었습니다: ${missing.join(', ')}`);
    }
    return true;
}

// 간단한 레이트 리미팅 (메모리 기반)
const requestCounts = new Map();

export function checkRateLimit(req, res, maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const identifier = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        'anonymous';

    const now = Date.now();
    const windowStart = now - windowMs;

    // 기존 요청 기록 가져오기
    const userRequests = requestCounts.get(identifier) || [];

    // 윈도우 밖의 오래된 요청들 제거
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

    // 요청 한도 확인
    if (validRequests.length >= maxRequests) {
        return sendError(res, 429, '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }

    // 새 요청 추가
    validRequests.push(now);
    requestCounts.set(identifier, validRequests);

    return true;
}

// API 핸들러 래퍼
export function createApiHandler(handler, options = {}) {
    const {
        methods = ['GET', 'POST'],
        rateLimit = false,
        requiredFields = []
    } = options;

    return async (req, res) => {
        try {
            // 메서드 검증
            if (validateMethod(req, res, methods) !== true) return;

            // 레이트 리미팅
            if (rateLimit && checkRateLimit(req, res) !== true) return;

            // 필수 필드 검증 (POST, PUT 요청에만)
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && requiredFields.length > 0) {
                if (validateRequiredFields(req, res, requiredFields) !== true) return;
            }

            // 실제 핸들러 실행
            return await handler(req, res);

        } catch (error) {
            console.error('API Error:', error);

            // MongoDB 연결 오류
            if (error.name === 'MongoNetworkError') {
                return sendError(res, 503, '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }

            // Validation 오류
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(err => err.message);
                return sendError(res, 400, messages.join(', '));
            }

            // 일반적인 오류
            return sendError(res, 500, '서버 오류가 발생했습니다.', error);
        }
    };
}