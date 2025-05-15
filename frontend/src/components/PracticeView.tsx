import React, { useState, useEffect } from 'react';
import { Flashcard, AnswerDifficulty } from '../types';
import { fetchPracticeCards, submitAnswer, advanceDay } from '../services/api';
import FlashcardDisplay from './FlashcardDisplay';

const PracticeView: React.FC = () => {
    const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showBack, setShowBack] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [day, setDay] = useState(1);
    const [sessionFinished, setSessionFinished] = useState(false);

    const loadPracticeCards = async () => {
        setIsLoading(true);
        setError(null);
        setSessionFinished(false);
        try {
            const session = await fetchPracticeCards();
            setPracticeCards(session.cards);
            setDay(session.day);
            setSessionFinished(session.cards.length === 0);
        } catch (err) {
            setError('Failed to load practice session');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadPracticeCards();
    }, []);

    const handleShowBack = () => setShowBack(true);

    const handleAnswer = async (difficulty: AnswerDifficulty) => {
        if (!practiceCards.length) return;
        const currentCard = practiceCards[currentCardIndex];
        try {
            if (currentCard && typeof currentCard.id === 'number') {
    await submitAnswer(currentCard.id, difficulty);
} else {
    console.error("Cannot submit answer: currentCard or currentCard.id is missing.", currentCard);
}
            if (currentCardIndex + 1 < practiceCards.length) {
                setCurrentCardIndex((prev) => prev + 1);
                setShowBack(false);
            } else {
                setSessionFinished(true);
            }
        } catch (err) {
            setError('Failed to submit answer');
        }
    };

    const handleNextDay = async () => {
        try {
            const { currentDay } = await advanceDay();
            setDay(currentDay);
            loadPracticeCards();
        } catch (err) {
            setError('Failed to advance day');
        }
    };

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p className="error">{error}</p>;
    if (sessionFinished) return (
        <div>
            <p>Session Complete!</p>
            <button onClick={handleNextDay}>Go to Next Day</button>
        </div>
    );

    const currentCard = practiceCards[currentCardIndex];

    return (
        <div className="practice-view">
            <p>Day {day}</p>
            <p>Card {currentCardIndex + 1} of {practiceCards.length}</p>
            <FlashcardDisplay card={currentCard} showBack={showBack} />
            {!showBack ? (
                <button onClick={handleShowBack}>Show Answer</button>
            ) : (
                <div>
                    <button onClick={() => handleAnswer(AnswerDifficulty.Easy)}>Easy</button>
                    <button onClick={() => handleAnswer(AnswerDifficulty.Hard)}>Hard</button>
                    <button onClick={() => handleAnswer(AnswerDifficulty.Wrong)}>Wrong</button>
                </div>
            )}
        </div>
    );
};

export default PracticeView;
