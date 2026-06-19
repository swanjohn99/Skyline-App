import { useNavigate } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';

// Lets users without a company join or create one later (no skip).
export default function SetupPage() {
  const navigate = useNavigate();
  return <OnboardingPage allowSkip={false} onDone={() => navigate('/')} />;
}
