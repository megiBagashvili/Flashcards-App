import { Keypoint } from '@tensorflow-models/hand-pose-detection';

// --- Define Gesture Enum ---
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