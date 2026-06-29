import { useEffect } from 'react';
import { setDocumentTitle } from '../utils/pageTitle';
import { useAuth } from '../context/auth';

export function usePageTitle(title) {
  const { companyName } = useAuth();
  useEffect(() => {
    setDocumentTitle(title, companyName);
  }, [title, companyName]);
}
