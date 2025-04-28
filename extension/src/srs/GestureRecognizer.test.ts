import { GestureRecognizer, Gesture } from './GestureRecognizer'; 
import { Keypoint } from '@tensorflow-models/hand-pose-detection'; 

const WRIST = 0;
const THUMB_CMC = 1; const THUMB_MCP = 2; const THUMB_IP = 3; const THUMB_TIP = 4;
const INDEX_FINGER_MCP = 5; const INDEX_FINGER_PIP = 6; const INDEX_FINGER_DIP = 7; const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_MCP = 9; const MIDDLE_FINGER_PIP = 10; const MIDDLE_FINGER_DIP = 11; const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_MCP = 13; const RING_FINGER_PIP = 14; const RING_FINGER_DIP = 15; const RING_FINGER_TIP = 16;
const PINKY_MCP = 17; const PINKY_PIP = 18; const PINKY_DIP = 19; const PINKY_TIP = 20;

// --- Mock Landmark Data Generation ---
// Helper function to create a basic landmark structure
// Note: These are simplified and focus on relative Y positions. Adjust as needed.
// Assumes lower Y means higher on screen.
function createMockLandmarks(config: { [key: number]: { y: number } }): Keypoint[] {
    const landmarks: Keypoint[] = [];
    for (let i = 0; i < 21; i++) {
        const yPos = config[i]?.y ?? (100 + i * 5); 
        landmarks.push({ x: 50, y: yPos, name: `landmark_${i}` }); 
    }
    return landmarks;
}

const mockThumbsUp: Keypoint[] = createMockLandmarks({
    [WRIST]: { y: 200 }, [THUMB_CMC]: { y: 180 }, [THUMB_MCP]: { y: 160 }, [THUMB_IP]: { y: 140 }, [THUMB_TIP]: { y: 100 }, // Thumb tip clearly above IP and other MCPs
    [INDEX_FINGER_MCP]: { y: 150 }, [INDEX_FINGER_PIP]: { y: 160 }, [INDEX_FINGER_DIP]: { y: 170 }, [INDEX_FINGER_TIP]: { y: 180 }, // Tip below PIP (curled)
    [MIDDLE_FINGER_MCP]: { y: 145 }, [MIDDLE_FINGER_PIP]: { y: 155 }, [MIDDLE_FINGER_DIP]: { y: 165 }, [MIDDLE_FINGER_TIP]: { y: 175 }, // Tip below PIP (curled)
    [RING_FINGER_MCP]: { y: 150 }, [RING_FINGER_PIP]: { y: 160 }, [RING_FINGER_DIP]: { y: 170 }, [RING_FINGER_TIP]: { y: 180 }, // Tip below PIP (curled)
    [PINKY_MCP]: { y: 155 }, [PINKY_PIP]: { y: 165 }, [PINKY_DIP]: { y: 175 }, [PINKY_TIP]: { y: 185 }, // Tip below PIP (curled)
});

const mockThumbsDown: Keypoint[] = createMockLandmarks({
    [WRIST]: { y: 100 }, [THUMB_CMC]: { y: 120 }, [THUMB_MCP]: { y: 140 }, [THUMB_IP]: { y: 160 }, [THUMB_TIP]: { y: 180 }, // Thumb tip clearly below MCP and Wrist
    [INDEX_FINGER_MCP]: { y: 110 }, [INDEX_FINGER_PIP]: { y: 120 }, [INDEX_FINGER_DIP]: { y: 130 }, [INDEX_FINGER_TIP]: { y: 140 }, // Tip below PIP (curled)
    [MIDDLE_FINGER_MCP]: { y: 105 }, [MIDDLE_FINGER_PIP]: { y: 115 }, [MIDDLE_FINGER_DIP]: { y: 125 }, [MIDDLE_FINGER_TIP]: { y: 135 }, // Tip below PIP (curled)
    [RING_FINGER_MCP]: { y: 110 }, [RING_FINGER_PIP]: { y: 120 }, [RING_FINGER_DIP]: { y: 130 }, [RING_FINGER_TIP]: { y: 140 }, // Tip below PIP (curled)
    [PINKY_MCP]: { y: 115 }, [PINKY_PIP]: { y: 125 }, [PINKY_DIP]: { y: 135 }, [PINKY_TIP]: { y: 145 }, // Tip below PIP (curled)
});

// Mock Data for Flat Hand (Ensure tips are above MCPs too for refined logic)
const mockFlatHand: Keypoint[] = createMockLandmarks({
    [WRIST]: { y: 200 },
    // Thumb tip above IP
    [THUMB_CMC]: { y: 180 }, [THUMB_MCP]: { y: 160 }, [THUMB_IP]: { y: 140 }, [THUMB_TIP]: { y: 120 },
    // Other finger tips well above PIP and MCP
    [INDEX_FINGER_MCP]: { y: 170 }, [INDEX_FINGER_PIP]: { y: 140 }, [INDEX_FINGER_DIP]: { y: 120 }, [INDEX_FINGER_TIP]: { y: 100 },
    [MIDDLE_FINGER_MCP]: { y: 168 }, [MIDDLE_FINGER_PIP]: { y: 138 }, [MIDDLE_FINGER_DIP]: { y: 118 }, [MIDDLE_FINGER_TIP]: { y: 98 },
    [RING_FINGER_MCP]: { y: 170 }, [RING_FINGER_PIP]: { y: 140 }, [RING_FINGER_DIP]: { y: 120 }, [RING_FINGER_TIP]: { y: 100 },
    [PINKY_MCP]: { y: 175 }, [PINKY_PIP]: { y: 145 }, [PINKY_DIP]: { y: 125 }, [PINKY_TIP]: { y: 105 },
});

// Mock data for an ambiguous case (e.g., closed fist)
const mockClosedFist: Keypoint[] = createMockLandmarks({
    [WRIST]: { y: 200 }, [THUMB_CMC]: { y: 180 }, [THUMB_MCP]: { y: 160 }, [THUMB_IP]: { y: 150 }, [THUMB_TIP]: { y: 155 }, // Thumb tip near/below IP
    [INDEX_FINGER_MCP]: { y: 170 }, [INDEX_FINGER_PIP]: { y: 160 }, [INDEX_FINGER_DIP]: { y: 155 }, [INDEX_FINGER_TIP]: { y: 165 }, // Tip below PIP
    [MIDDLE_FINGER_MCP]: { y: 170 }, [MIDDLE_FINGER_PIP]: { y: 160 }, [MIDDLE_FINGER_DIP]: { y: 155 }, [MIDDLE_FINGER_TIP]: { y: 165 }, // Tip below PIP
    [RING_FINGER_MCP]: { y: 170 }, [RING_FINGER_PIP]: { y: 160 }, [RING_FINGER_DIP]: { y: 155 }, [RING_FINGER_TIP]: { y: 165 }, // Tip below PIP
    [PINKY_MCP]: { y: 175 }, [PINKY_PIP]: { y: 165 }, [PINKY_DIP]: { y: 160 }, [PINKY_TIP]: { y: 170 },  // Tip below PIP
});

const mockInvalidInputShort: Keypoint[] = createMockLandmarks({}).slice(0, 10); // Only 10 landmarks
const mockInvalidInputNull: Keypoint[] | null = null;
const mockInvalidInputUndefined: Keypoint[] | undefined = undefined;

const mockSlightlyCurledFlatHand: Keypoint[] = createMockLandmarks({ // Pinky tip is slightly below PIP
    [WRIST]: { y: 200 }, [THUMB_CMC]: { y: 180 }, [THUMB_MCP]: { y: 160 }, [THUMB_IP]: { y: 140 }, [THUMB_TIP]: { y: 120 },
    [INDEX_FINGER_MCP]: { y: 170 }, [INDEX_FINGER_PIP]: { y: 140 }, [INDEX_FINGER_DIP]: { y: 120 }, [INDEX_FINGER_TIP]: { y: 100 },
    [MIDDLE_FINGER_MCP]: { y: 168 }, [MIDDLE_FINGER_PIP]: { y: 138 }, [MIDDLE_FINGER_DIP]: { y: 118 }, [MIDDLE_FINGER_TIP]: { y: 98 },
    [RING_FINGER_MCP]: { y: 170 }, [RING_FINGER_PIP]: { y: 140 }, [RING_FINGER_DIP]: { y: 120 }, [RING_FINGER_TIP]: { y: 100 },
    [PINKY_MCP]: { y: 175 }, [PINKY_PIP]: { y: 145 }, [PINKY_DIP]: { y: 148 }, [PINKY_TIP]: { y: 150 }, // Pinky slightly curled
});

const mockLowThumbUp: Keypoint[] = createMockLandmarks({ // Thumb tip is above IP but NOT above index MCP
    [WRIST]: { y: 200 }, [THUMB_CMC]: { y: 180 }, [THUMB_MCP]: { y: 160 }, [THUMB_IP]: { y: 140 }, [THUMB_TIP]: { y: 130 }, // Thumb tip higher than IP, but lower than Index MCP
    [INDEX_FINGER_MCP]: { y: 125 }, [INDEX_FINGER_PIP]: { y: 135 }, [INDEX_FINGER_DIP]: { y: 145 }, [INDEX_FINGER_TIP]: { y: 155 }, // Curled
    [MIDDLE_FINGER_MCP]: { y: 120 }, [MIDDLE_FINGER_PIP]: { y: 130 }, [MIDDLE_FINGER_DIP]: { y: 140 }, [MIDDLE_FINGER_TIP]: { y: 150 }, // Curled
    [RING_FINGER_MCP]: { y: 125 }, [RING_FINGER_PIP]: { y: 135 }, [RING_FINGER_DIP]: { y: 145 }, [RING_FINGER_TIP]: { y: 155 }, // Curled
    [PINKY_MCP]: { y: 130 }, [PINKY_PIP]: { y: 140 }, [PINKY_DIP]: { y: 150 }, [PINKY_TIP]: { y: 160 }, // Curled
});

describe('GestureRecognizer', () => {
    let recognizer: GestureRecognizer;

    beforeEach(() => {
        recognizer = new GestureRecognizer();
    });

    it('should recognize Thumbs Up gesture', () => {
        const result = recognizer.recognizeGesture(mockThumbsUp);
        expect(result).toBe(Gesture.ThumbsUp);
    });

    it('should recognize Thumbs Down gesture', () => {
        const result = recognizer.recognizeGesture(mockThumbsDown);
        expect(result).toBe(Gesture.ThumbsDown);
    });

    it('should recognize Flat Hand gesture', () => {
        const result = recognizer.recognizeGesture(mockFlatHand); 
        expect(result).toBe(Gesture.FlatHand);
    });

    it('should return Unknown for an ambiguous gesture (e.g., closed fist)', () => {
        const result = recognizer.recognizeGesture(mockClosedFist);
        expect(result).toBe(Gesture.Unknown);
    });

    it('should return Unknown for input with less than 21 landmarks', () => {
        const result = recognizer.recognizeGesture(mockInvalidInputShort);
        expect(result).toBe(Gesture.Unknown);
    });

    it('should return Unknown for null input', () => {
        const result = recognizer.recognizeGesture(mockInvalidInputNull as unknown as Keypoint[]);
        expect(result).toBe(Gesture.Unknown);
    });

     it('should return Unknown for undefined input', () => {
        const result = recognizer.recognizeGesture(mockInvalidInputUndefined as unknown as Keypoint[]);
        expect(result).toBe(Gesture.Unknown);
    });

     it('should return Unknown for a slightly flat hand', () => {
        const result = recognizer.recognizeGesture(mockSlightlyCurledFlatHand);
        expect(result).toBe(Gesture.Unknown);
    });

     it('should return Unknown for a slightly flat hand', () => {
        const result = recognizer.recognizeGesture(mockLowThumbUp);
        expect(result).toBe(Gesture.Unknown);
    });

});
