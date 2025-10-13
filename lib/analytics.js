// 간단한 클라이언트 사이드 분석
class SimpleAnalytics {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = null;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  setUserId(userId) {
    this.userId = userId;
  }

  track(eventName, properties = {}) {
    const event = {
      eventName,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    this.events.push(event);

    // 로컬 스토리지에 저장 (실제 서비스에서는 서버로 전송)
    this.saveToLocalStorage();

    // 개발 모드에서 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  }

  saveToLocalStorage() {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      const allEvents = [...existingEvents, ...this.events];

      // 최대 1000개 이벤트만 저장
      const limitedEvents = allEvents.slice(-1000);

      localStorage.setItem('analytics_events', JSON.stringify(limitedEvents));
      this.events = []; // 저장 후 초기화
    } catch (error) {
      console.error('Analytics 저장 실패:', error);
    }
  }

  // 주요 이벤트들
  trackPageView(pageName) {
    this.track('page_view', { pageName });
  }

  trackRestaurantSelection(restaurant, method = 'random') {
    this.track('restaurant_selected', {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      category: restaurant.category,
      method // 'random', 'manual', 'filter'
    });
  }

  trackRestaurantAdd(restaurant) {
    this.track('restaurant_added', {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      category: restaurant.category
    });
  }

  trackReviewSubmit(review) {
    this.track('review_submitted', {
      restaurantId: review.restaurantId,
      rating: review.rating,
      contentLength: review.content.length
    });
  }

  trackUserLogin(user) {
    this.track('user_login', {
      userId: user._id,
      userName: user.name,
      isNewUser: user.isNewUser || false
    });
  }

  trackError(error, context = {}) {
    this.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      context
    });
  }

  // 통계 조회
  getStats() {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');

      const stats = {
        totalEvents: events.length,
        uniqueSessions: new Set(events.map(e => e.sessionId)).size,
        topEvents: this.getTopEvents(events),
        topRestaurants: this.getTopRestaurants(events),
        errorCount: events.filter(e => e.eventName === 'error_occurred').length
      };

      return stats;
    } catch (error) {
      console.error('Analytics 통계 조회 실패:', error);
      return null;
    }
  }

  getTopEvents(events) {
    const eventCounts = {};
    events.forEach(event => {
      eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  getTopRestaurants(events) {
    const restaurantCounts = {};
    events
      .filter(e => e.eventName === 'restaurant_selected')
      .forEach(event => {
        const name = event.properties.restaurantName;
        restaurantCounts[name] = (restaurantCounts[name] || 0) + 1;
      });

    return Object.entries(restaurantCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }
}

// 전역 인스턴스 생성
export const analytics = new SimpleAnalytics();

// React Hook
export function useAnalytics() {
  return analytics;
}