import { z } from 'zod';

// 가게 스키마
export const restaurantSchema = z.object({
  name: z.string()
    .min(1, '가게 이름은 필수입니다')
    .max(50, '가게 이름은 50자를 초과할 수 없습니다')
    .trim(),
  distance: z.string()
    .min(1, '거리 정보는 필수입니다')
    .trim(),
  category: z.enum(['한식', '중식', '일식', '양식', '분식', '치킨', '카페', '베트남식', '기타']),
  image: z.string()
    .url('올바른 이미지 URL을 입력해주세요')
    .min(1, '이미지 URL은 필수입니다'),
  description: z.string()
    .max(200, '설명은 200자를 초과할 수 없습니다')
    .optional(),
  websiteUrl: z.string()
    .url('올바른 웹사이트 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
  createdBy: z.string().min(1, '생성자 정보는 필수입니다')
});

// 사용자 스키마
export const userSchema = z.object({
  name: z.string()
    .min(2, '사용자 이름은 2글자 이상이어야 합니다')
    .max(30, '사용자 이름은 30자를 초과할 수 없습니다')
    .trim(),
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .optional(),
  role: z.enum(['user', 'admin']).default('user')
});

// 리뷰 스키마
export const reviewSchema = z.object({
  userId: z.string().min(1, '사용자 ID는 필수입니다'),
  userName: z.string().min(1, '사용자 이름은 필수입니다'),
  restaurantId: z.string().min(1, '가게 ID는 필수입니다'),
  rating: z.number()
    .min(1, '평점은 1점 이상이어야 합니다')
    .max(5, '평점은 5점 이하여야 합니다'),
  content: z.string()
    .min(1, '리뷰 내용은 필수입니다')
    .max(500, '리뷰는 500자를 초과할 수 없습니다')
    .trim()
});

// 방문 기록 스키마
export const visitSchema = z.object({
  userId: z.string().min(1, '사용자 ID는 필수입니다'),
  userName: z.string().min(1, '사용자 이름은 필수입니다'),
  restaurantId: z.string().min(1, '가게 ID는 필수입니다'),
  restaurantName: z.string().min(1, '가게 이름은 필수입니다')
});

// 선택 기록 스키마
export const selectionSchema = z.object({
  userId: z.string().min(1, '사용자 ID는 필수입니다'),
  userName: z.string().min(1, '사용자 이름은 필수입니다'),
  restaurantId: z.string().min(1, '가게 ID는 필수입니다'),
  restaurantName: z.string().min(1, '가게 이름은 필수입니다'),
  category: z.string().optional()
});

// 피드백 스키마
export const feedbackSchema = z.object({
  userId: z.string().min(1, '사용자 ID는 필수입니다'),
  userName: z.string().min(1, '사용자 이름은 필수입니다'),
  type: z.enum(['feature_request', 'bug_report', 'improvement', 'general']),
  title: z.string()
    .min(1, '제목은 필수입니다')
    .max(100, '제목은 100자를 초과할 수 없습니다')
    .trim(),
  content: z.string()
    .min(1, '내용은 필수입니다')
    .max(1000, '내용은 1000자를 초과할 수 없습니다')
    .trim(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

// 간단한 검증 헬퍼 함수들
export function validateData(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
}

// 요청 body 검증
export function validateRequestBody(req, res, schema) {
  const result = validateData(schema, req.body);
  
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: '입력 데이터가 올바르지 않습니다',
      details: result.errors
    });
    return false;
  }
  
  req.body = result.data;
  return true;
}

// 쿼리 파라미터 검증
export function validateRequestQuery(req, res, schema) {
  const result = validateData(schema, req.query);
  
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Query Validation Error',
      message: '쿼리 파라미터가 올바르지 않습니다',
      details: result.errors
    });
    return false;
  }
  
  req.query = result.data;
  return true;
}