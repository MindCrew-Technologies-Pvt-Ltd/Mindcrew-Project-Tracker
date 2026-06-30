import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAppDispatch } from './hooks/useAppDispatch';
import { useAppSelector } from './hooks/useAppSelector';
import { fetchMeThunk } from './store/slices/authSlice';
import AppRouter from './router/AppRouter';
import LoadingSpinner from './components/common/LoadingSpinner';

function AppContent() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, initializing, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchMeThunk());
    }
  }, [dispatch, isAuthenticated]); // eslint-disable-line

  if (loading || initializing) return <LoadingSpinner fullScreen />;

  return <AppRouter />;
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
