// 환경변수 검증 및 기본값 설정
const requiredEnvVars = {
  MONGODB_URI: process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const optionalEnvVars = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '123',
  MAX_RESTAURANTS_PER_USER: parseInt(process.env.MAX_RESTAURANTS_PER_USER || '50'),
  RATE_LIMIT_REQUESTS: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15분
};

// 필수 환경변수 검증
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`필수 환경변수 ${key}가 설정되지 않았습니다.`);
  }
}

export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
  isDevelopment: requiredEnvVars.NODE_ENV === 'development',
  isProduction: requiredEnvVars.NODE_ENV === 'production',
};