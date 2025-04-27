import { Keypoint } from '@tensorflow-models/hand-pose-detection';

/**
 * Represents the possible recognized hand gestures.
 * Using string values makes debugging easier.
 */
export enum Gesture {
    ThumbsUp = 'Thumbs Up',       
    ThumbsDown = 'Thumbs Down',   
    FlatHand = 'Flat Hand',       
    Unknown = 'Unknown'           
}

const WRIST = 0;
const THUMB_CMC = 1; 
const THUMB_MCP = 2; 
const THUMB_IP = 3; 
const THUMB_TIP = 4;
const INDEX_FINGER_MCP = 5; 
const INDEX_FINGER_PIP = 6; 
const INDEX_FINGER_DIP = 7; 
const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_MCP = 9; 
const MIDDLE_FINGER_PIP = 10; 
const MIDDLE_FINGER_DIP = 11; 
const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_MCP = 13; 
const RING_FINGER_PIP = 14; 
const RING_FINGER_DIP = 15; 
const RING_FINGER_TIP = 16;
const PINKY_MCP = 17; 
const PINKY_PIP = 18; 
const PINKY_DIP = 19; 
const PINKY_TIP = 20;


/**
 * @class GestureRecognizer
 *
 * @specification
 * Recognizes specific, predefined hand gestures (ThumbsUp, ThumbsDown, FlatHand)
 * from a list of 21 2D or 3D hand landmark coordinates provided by a hand
 * pose detection model.
 *
 * @abstractionFunction AF(instance) = A stateless utility object capable of classifying
 * a given set of 21 hand landmarks into one of the gestures defined in the
 * Gesture enum based on predefined geometric rules.
 *
 * @representationInvariant RI(instance) = true.
 *
 */
export class GestureRecognizer {

    /**
     * Creates an instance of GestureRecognizer.
     */
    constructor() {
        console.log("GestureRecognizer initialized.");
        this.checkRep();
    }

    /**
     * @method recognizeGesture
     * Analyzes an array of 21 hand landmarks to determine the current gesture
     * based on predefined geometric conditions.
     *
     * @param landmarks An array of 21 hand landmark objects.
     * Requires at least `x` and `y` coordinates.
     * @returns The recognized `Gesture` enum value. Returns `Gesture.Unknown` if
     * input is invalid or no specific gesture is confidently matched.
     *
     * @specConditions
     * - Requires `landmarks` to be a valid array of at least 21 `Keypoint` objects.
     * - Uses Y-coordinates primarily.
     *
     * 1. ThumbsUp: Thumb tip is clearly above thumb IP joint and also above the index finger MCP joint. Other fingertips are below their respective PIP joints.
     * 2. ThumbsDown: Thumb tip is clearly below the thumb MCP joint and wrist. Other fingertips are below their respective PIP joints.
     * 3. FlatHand: All five fingertips are clearly above their respective PIP joints (and potentially MCP joints).
     * - If none match, returns `Gesture.Unknown`.
     * - "Clearly" implies using simple comparison logic for now. Thresholds might be needed later.
     */
    public recognizeGesture(landmarks: Keypoint[]): Gesture {
        this.checkRep();
        if (!landmarks || landmarks.length < 21) {
             console.error("Invalid landmarks provided for gesture recognition.");
             return Gesture.Unknown;
        }

        let result: Gesture = Gesture.Unknown;
        if (this.isThumbsUp(landmarks)) {
            result = Gesture.ThumbsUp;
        } else if (this.isThumbsDown(landmarks)) {
            result = Gesture.ThumbsDown;
        } else if (this.isFlatHand(landmarks)) {
            result = Gesture.FlatHand;
        }
        return result;
    }

    /**
     * Checks if the landmarks indicate a Thumbs Up gesture.
     * @param landmarks Array of 21 Keypoints.
     * @returns True if the gesture is likely Thumbs Up, false otherwise.
     */
    private isThumbsUp(landmarks: Keypoint[]): boolean {
        try {
            const thumbTipUp = landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y;
            const thumbAboveIndexMCP = landmarks[THUMB_TIP].y < landmarks[INDEX_FINGER_MCP].y;
            const indexCurl = landmarks[INDEX_FINGER_TIP].y > landmarks[INDEX_FINGER_PIP].y;
            const middleCurl = landmarks[MIDDLE_FINGER_TIP].y > landmarks[MIDDLE_FINGER_PIP].y;
            const ringCurl = landmarks[RING_FINGER_TIP].y > landmarks[RING_FINGER_PIP].y;
            const pinkyCurl = landmarks[PINKY_TIP].y > landmarks[PINKY_PIP].y;

            return thumbTipUp && thumbAboveIndexMCP && indexCurl && middleCurl && ringCurl && pinkyCurl;
        } catch (e) {
            console.error("Error checking ThumbsUp:", e);
            return false;
        }
    }

    /**
     * Checks if the landmarks indicate a Thumbs Down gesture.
     * @param landmarks Array of 21 Keypoints.
     * @returns True if the gesture is likely Thumbs Down, false otherwise.
     */
    private isThumbsDown(landmarks: Keypoint[]): boolean {
         try {
            const thumbTipDown = landmarks[THUMB_TIP].y > landmarks[THUMB_MCP].y;
            const thumbBelowWrist = landmarks[THUMB_TIP].y > landmarks[WRIST].y;
            const indexCurl = landmarks[INDEX_FINGER_TIP].y > landmarks[INDEX_FINGER_PIP].y;
            const middleCurl = landmarks[MIDDLE_FINGER_TIP].y > landmarks[MIDDLE_FINGER_PIP].y;
            const ringCurl = landmarks[RING_FINGER_TIP].y > landmarks[RING_FINGER_PIP].y;
            const pinkyCurl = landmarks[PINKY_TIP].y > landmarks[PINKY_PIP].y;

            return thumbTipDown && thumbBelowWrist && indexCurl && middleCurl && ringCurl && pinkyCurl;
        } catch (e) {
            console.error("Error checking ThumbsDown:", e);
            return false;
        }
    }

    /**
     * Checks if the landmarks indicate a Flat Hand gesture.
     * @param landmarks Array of 21 Keypoints.
     * @returns True if the gesture is likely Flat Hand, false otherwise.
     */
    private isFlatHand(landmarks: Keypoint[]): boolean {
         try {
            const thumbExtended = landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y;
            const indexExtended = landmarks[INDEX_FINGER_TIP].y < landmarks[INDEX_FINGER_PIP].y;
            const middleExtended = landmarks[MIDDLE_FINGER_TIP].y < landmarks[MIDDLE_FINGER_PIP].y;
            const ringExtended = landmarks[RING_FINGER_TIP].y < landmarks[RING_FINGER_PIP].y;
            const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

            return thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
         } catch(e) {
            console.error("Error checking FlatHand:", e);
            return false;
         }
    }


    /**
     * @method checkRep
     * Checks that the representation invariant holds for this instance.
     * this class is currently stateless so RI always trues.
     *
     * @custom JSDoc tag for RI
     * @representationInvariant Returns true. (Class is stateless).
     */
    private checkRep(): void {
        return;
    }
}


