import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // 에러 로깅 (실제 서비스에서는 Sentry 등 사용)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 앗! 문제가 발생했습니다</h2>
            <p>예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.</p>
            
            <div className="error-actions">
              <button 
                className="btn primary"
                onClick={() => window.location.reload()}
              >
                🔄 페이지 새로고침
              </button>
              <button 
                className="btn secondary"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              >
                🔙 다시 시도
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>개발자 정보 (개발 모드에서만 표시)</summary>
                <pre className="error-stack">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;