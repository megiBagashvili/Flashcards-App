import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { fetchHint } from '../services/api';

interface FlashcardDisplayProps {
  card: Flashcard;
  showBack: boolean;
}

const FlashcardDisplay: React.FC<FlashcardDisplayProps> = ({ card, showBack }) => {
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const handleGetHint = async () => {
    setLoadingHint(true);
    setHintError(null);
    try {
      const fetchedHint = await fetchHint(card);
      setHint(fetchedHint);
    } catch (error) {
      setHintError('Failed to fetch hint');
    }
    setLoadingHint(false);
  };

  useEffect(() => {
    setHint(null);
    setHintError(null);
    setLoadingHint(false);
  }, [card.front, card.back]);

  return (
    <div className="flashcard">
      <h2>{card.front}</h2>
      <p>{showBack ? card.back : '???'}</p>
      {!showBack && (
        <button onClick={handleGetHint} disabled={loadingHint}>
          {loadingHint ? 'Loading...' : 'Get Hint'}
        </button>
      )}
      {hint && <p>Hint: {hint}</p>}
      {hintError && <p className="error">{hintError}</p>}
    </div>
  );
};

export default FlashcardDisplay;