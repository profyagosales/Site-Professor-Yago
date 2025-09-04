import { Component } from 'react';
import { toast } from 'react-toastify';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
    toast.error('Ocorreu um erro inesperado');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='p-md'>
          <p>Algo deu errado.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
