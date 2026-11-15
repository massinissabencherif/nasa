import { useEffect } from 'react';
import { useApi } from '../lib/ApiProvider';
import { loadReactionProtocol, syncReactions } from '../lib/reactionStorage';

export function ReactionSync() {
  const api = useApi();
  useEffect(() => {
    const sync = () => {
      void syncReactions(api);
    };
    void loadReactionProtocol(api).catch(() => {});
    sync();
    const timer = window.setInterval(sync, 10000);
    window.addEventListener('online', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', sync);
    };
  }, [api]);
  return null;
}
