import React, { useState, useEffect } from 'react';
import { Flashcard, AnswerDifficulty, PracticeSession } from '../types';
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
        setCurrentCardIndex(0);
        setShowBack(false);
        try {
            const session: PracticeSession = await fetchPracticeCards();
            setPracticeCards(session.cards);
            setDay(session.day);
            if (session.cards.length === 0) {
                setSessionFinished(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load practice session');
            setPracticeCards([]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadPracticeCards();
    }, []);

    const handleShowBack = () => setShowBack(true);

    const handleAnswer = async (difficulty: AnswerDifficulty) => {
        if (!practiceCards.length || currentCardIndex >= practiceCards.length) return;

        const currentCard = practiceCards[currentCardIndex];
        if (!currentCard || typeof currentCard.id !== 'number') {
            console.error("Error: currentCard or currentCard.id is undefined.", currentCard);
            setError("Error: Card data is incomplete. Cannot submit answer.");
            return;
        }

        try {
            await submitAnswer(currentCard.id, difficulty);

            if (currentCardIndex + 1 < practiceCards.length) {
                setCurrentCardIndex((prev) => prev + 1);
                setShowBack(false);
            } else {
                setSessionFinished(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit answer');
        }
    };

    const handleNextDay = async () => {
        setIsLoading(true);
        try {
            const data = await advanceDay();
            setDay(data.currentDay);
            await loadPracticeCards();
        } catch (err: any) {
            setError(err.message || 'Failed to advance day');
            setIsLoading(false);
        }
    };

    if (isLoading) return <p>Loading session...</p>;
    if (error) return <p className="error">{error} <button onClick={loadPracticeCards}>Try Again</button></p>;

    if (!practiceCards.length || sessionFinished) {
        return (
            <div>
                <p>Session Complete for Day {day} or no cards due!</p>
                <button onClick={handleNextDay}>Go to Next Day ({day + 1})</button>
            </div>
        );
    }

    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) {
         return <p>Error: No current card to display. <button onClick={loadPracticeCards}>Reload Session</button></p>;
    }

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