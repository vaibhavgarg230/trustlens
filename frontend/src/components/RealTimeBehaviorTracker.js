import React, { useState, useEffect, useRef } from 'react';

const RealTimeBehaviorTracker = ({ isActive, onAnalysisResult }) => {
  const [keystrokeData, setKeystrokeData] = useState([]);
  const [mouseData, setMouseData] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [lastKeyPressed, setLastKeyPressed] = useState('');
  
  const keystrokeBuffer = useRef([]);
  const mouseBuffer = useRef([]);
  const lastKeyTime = useRef(null);
  const lastMouseTime = useRef(null);
  const analysisTimeoutRef = useRef(null);

  // Start tracking when component becomes active
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive]);

  const startTracking = () => {
    setIsTracking(true);
    setSessionStart(Date.now());
    setKeystrokeData([]);
    setMouseData([]);
    setCurrentAnalysis(null);
    setLastKeyPressed('');
    
    // Clear any existing timeouts
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    
    // Add event listeners directly
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleMouseClick);
    
    console.log('🎯 Real-time behavioral tracking started');
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    // Clear timeouts
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleMouseClick);
    
    console.log('🛑 Real-time behavioral tracking stopped');
  };

  const handleKeyDown = (event) => {
    // Prevent tracking if typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const now = Date.now();
    const interval = lastKeyTime.current ? now - lastKeyTime.current : 0;
    
    const keystroke = {
      key: event.key,
      timestamp: now,
      interval: interval,
      keyCode: event.keyCode,
      isSpecialKey: event.ctrlKey || event.altKey || event.shiftKey || event.metaKey
    };

    keystrokeBuffer.current.push(keystroke);
    lastKeyTime.current = now;
    setLastKeyPressed(event.key);

    // Prevent buffer from growing too large
    if (keystrokeBuffer.current.length > 50) {
      keystrokeBuffer.current = keystrokeBuffer.current.slice(-25);
    }

    // Trigger analysis after a short delay, but only if not already analyzing
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    analysisTimeoutRef.current = setTimeout(() => {
      if (keystrokeBuffer.current.length >= 3) {
        analyzeKeystrokes();
      }
    }, 150);
  };

  const handleMouseMove = (event) => {
    const now = Date.now();
    const interval = lastMouseTime.current ? now - lastMouseTime.current : 0;
    
    // Only track mouse movements with reasonable intervals
    if (interval < 10) return;
    
    const mouseEvent = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
      interval: interval,
      type: 'move'
    };

    mouseBuffer.current.push(mouseEvent);
    lastMouseTime.current = now;

    // Prevent buffer from growing too large
    if (mouseBuffer.current.length > 100) {
      mouseBuffer.current = mouseBuffer.current.slice(-50);
    }

    // Analyze mouse movements less frequently
    if (mouseBuffer.current.length >= 20) {
      analyzeMouseMovements();
    }
  };

  const handleMouseClick = (event) => {
    const now = Date.now();
    const interval = lastMouseTime.current ? now - lastMouseTime.current : 0;
    
    const mouseEvent = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
      interval: interval,
      type: 'click'
    };

    mouseBuffer.current.push(mouseEvent);
    lastMouseTime.current = now;
  };

  const analyzeKeystrokes = () => {
    try {
      if (keystrokeBuffer.current.length < 3) return;

      // Use a smaller, more manageable sample for analysis
      const sampleSize = Math.min(keystrokeBuffer.current.length, 15);
      const sample = keystrokeBuffer.current.slice(-sampleSize);
      
      const intervals = sample
        .map(k => k.interval)
        .filter(i => i > 0 && i < 5000); // Filter out extreme values

      if (intervals.length < 2) return;

      const analysis = {
        type: 'keystroke',
        timestamp: Date.now(),
        data: {
          averageInterval: intervals.reduce((a, b) => a + b, 0) / intervals.length,
          variance: calculateVariance(intervals),
          consistency: calculateConsistency(intervals),
          specialKeyRatio: sample.filter(k => k.isSpecialKey).length / sample.length,
          totalKeystrokes: keystrokeBuffer.current.length
        },
        classification: classifyKeystrokePattern(intervals)
      };

      setCurrentAnalysis(analysis);
      onAnalysisResult && onAnalysisResult(analysis);
      
    } catch (error) {
      console.error('Error in keystroke analysis:', error);
      // Reset buffer if there's an error
      keystrokeBuffer.current = keystrokeBuffer.current.slice(-10);
    }
  };

  const analyzeMouseMovements = () => {
    try {
      if (mouseBuffer.current.length < 10) return;

      // Use a smaller, more manageable sample for analysis
      const sampleSize = Math.min(mouseBuffer.current.length, 30);
      const sample = mouseBuffer.current.slice(-sampleSize);
      
      const intervals = sample
        .map(m => m.interval)
        .filter(i => i > 0 && i < 2000); // Filter out extreme values
      
      if (intervals.length < 2) return;
      
      // Calculate movement patterns
      const distances = [];
      for (let i = 1; i < sample.length; i++) {
        const dx = sample[i].x - sample[i-1].x;
        const dy = sample[i].y - sample[i-1].y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < 1000) { // Filter out extreme movements
          distances.push(distance);
        }
      }

      if (distances.length < 2) return;

      const analysis = {
        type: 'mouse',
        timestamp: Date.now(),
        data: {
          averageInterval: intervals.reduce((a, b) => a + b, 0) / intervals.length,
          averageDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
          variance: calculateVariance(intervals),
          consistency: calculateConsistency(intervals),
          clickCount: sample.filter(m => m.type === 'click').length,
          totalMovements: mouseBuffer.current.length
        },
        classification: classifyMousePattern(intervals, distances)
      };

      setCurrentAnalysis(analysis);
      onAnalysisResult && onAnalysisResult(analysis);
      
    } catch (error) {
      console.error('Error in mouse analysis:', error);
      // Reset buffer if there's an error
      mouseBuffer.current = mouseBuffer.current.slice(-20);
    }
  };

  const calculateVariance = (values) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  };

  const calculateConsistency = (values) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const deviations = values.map(v => Math.abs(v - mean) / mean);
    return 1 - (deviations.reduce((a, b) => a + b, 0) / deviations.length);
  };

  const classifyKeystrokePattern = (intervals) => {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = calculateVariance(intervals);
    const consistency = calculateConsistency(intervals);

    // Bot detection criteria
    const isTooConsistent = consistency > 0.95; // Very consistent timing
    const isTooFast = avgInterval < 50; // Extremely fast typing
    const isTooSlow = avgInterval > 500; // Suspiciously slow
    const hasLowVariance = variance < 100; // Very low variation

    // Human-like criteria
    const hasNaturalVariation = variance > 200 && variance < 2000;
    const hasReasonableSpeed = avgInterval >= 100 && avgInterval <= 300;
    const hasModerateConsistency = consistency >= 0.3 && consistency <= 0.8;

    let risk = 'Low';
    let type = 'Human-like';
    let confidence = 85;

    if (isTooConsistent && hasLowVariance) {
      risk = 'High';
      type = 'Bot-like (Too Consistent)';
      confidence = 90;
    } else if (isTooFast) {
      risk = 'High';
      type = 'Bot-like (Too Fast)';
      confidence = 85;
    } else if (isTooSlow && isTooConsistent) {
      risk = 'Medium';
      type = 'Suspicious (Slow & Consistent)';
      confidence = 70;
    } else if (hasNaturalVariation && hasReasonableSpeed && hasModerateConsistency) {
      risk = 'Low';
      type = 'Human-like (Natural Variation)';
      confidence = 90;
    } else {
      // More specific human-friendly classifications instead of "Uncertain Pattern"
      if (avgInterval < 100) {
        risk = 'Low';
        type = 'Human-like (Fast Typist)';
        confidence = 75;
      } else if (avgInterval > 300) {
        risk = 'Low';
        type = 'Human-like (Careful Typist)';
        confidence = 75;
      } else if (variance < 200) {
        risk = 'Low';
        type = 'Human-like (Consistent Typist)';
        confidence = 70;
      } else if (variance > 2000) {
        risk = 'Low';
        type = 'Human-like (Variable Typist)';
        confidence = 70;
      } else if (consistency < 0.3) {
        risk = 'Low';
        type = 'Human-like (Natural Rhythm)';
        confidence = 75;
      } else if (consistency > 0.8) {
        risk = 'Low';
        type = 'Human-like (Steady Typist)';
        confidence = 70;
      } else {
        risk = 'Low';
        type = 'Human-like (Typical Pattern)';
        confidence = 65;
      }
    }

    return { risk, type, confidence };
  };

  const classifyMousePattern = (intervals, distances) => {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = calculateVariance(intervals);
    const consistency = calculateConsistency(intervals);

    // Bot detection criteria
    const isTooConsistent = consistency > 0.9;
    const isTooLinear = variance < 50; // Very linear movement
    const isTooFast = avgInterval < 10; // Extremely fast mouse movement
    const isTooSlow = avgInterval > 200; // Suspiciously slow

    // Human-like criteria
    const hasNaturalVariation = variance > 100 && variance < 1000;
    const hasReasonableSpeed = avgInterval >= 20 && avgInterval <= 100;
    const hasModerateConsistency = consistency >= 0.2 && consistency <= 0.7;

    let risk = 'Low';
    let type = 'Human-like';
    let confidence = 85;

    if (isTooConsistent && isTooLinear) {
      risk = 'High';
      type = 'Bot-like (Linear & Consistent)';
      confidence = 90;
    } else if (isTooFast && isTooConsistent) {
      risk = 'High';
      type = 'Bot-like (Fast & Consistent)';
      confidence = 85;
    } else if (isTooSlow && isTooConsistent) {
      risk = 'Medium';
      type = 'Suspicious (Slow & Consistent)';
      confidence = 70;
    } else if (hasNaturalVariation && hasReasonableSpeed && hasModerateConsistency) {
      risk = 'Low';
      type = 'Human-like (Natural Movement)';
      confidence = 90;
    } else {
      // More specific human-friendly classifications instead of "Uncertain Pattern"
      if (avgInterval < 20) {
        risk = 'Low';
        type = 'Human-like (Quick Mouse)';
        confidence = 75;
      } else if (avgInterval > 100) {
        risk = 'Low';
        type = 'Human-like (Deliberate Mouse)';
        confidence = 75;
      } else if (variance < 100) {
        risk = 'Low';
        type = 'Human-like (Smooth Movement)';
        confidence = 70;
      } else if (variance > 1000) {
        risk = 'Low';
        type = 'Human-like (Dynamic Movement)';
        confidence = 70;
      } else if (consistency < 0.2) {
        risk = 'Low';
        type = 'Human-like (Natural Variation)';
        confidence = 75;
      } else if (consistency > 0.7) {
        risk = 'Low';
        type = 'Human-like (Steady Movement)';
        confidence = 70;
      } else {
        risk = 'Low';
        type = 'Human-like (Typical Movement)';
        confidence = 65;
      }
    }

    return { risk, type, confidence };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
      // Clear all timeouts on unmount
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [isTracking]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Real-Time Behavioral Tracking</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isTracking ? 'text-green-600' : 'text-red-600'}`}>
              {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">How to Test:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Human-like:</strong> Type naturally with pauses and variations</li>
            <li>• <strong>Bot-like:</strong> Type very fast and consistently, or move mouse in straight lines</li>
            <li>• Analysis updates every 3 keystrokes or 20 mouse movements</li>
          </ul>
        </div>

        {/* Current Analysis */}
        {currentAnalysis && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Current Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                  currentAnalysis.classification.risk === 'High' 
                    ? 'bg-red-100 text-red-800'
                    : currentAnalysis.classification.risk === 'Low'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {currentAnalysis.classification.type}
                </div>
                <div className="text-sm text-gray-600">
                  Confidence: {currentAnalysis.classification.confidence}%
                </div>
                <div className="text-sm text-gray-600">
                  Risk Level: {currentAnalysis.classification.risk}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div>Type: {currentAnalysis.type}</div>
                <div>Variance: {Math.round(currentAnalysis.data.variance)}</div>
                <div>Consistency: {Math.round(currentAnalysis.data.consistency * 100)}%</div>
                {currentAnalysis.type === 'keystroke' && (
                  <div>Avg Interval: {Math.round(currentAnalysis.data.averageInterval)}ms</div>
                )}
                {currentAnalysis.type === 'mouse' && (
                  <div>Avg Distance: {Math.round(currentAnalysis.data.averageDistance)}px</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Session Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Session Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Keystrokes</div>
              <div className="font-semibold text-blue-600">{keystrokeBuffer.current.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Mouse Events</div>
              <div className="font-semibold text-green-600">{mouseBuffer.current.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Session Time</div>
              <div className="font-semibold">
                {sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : 0}s
              </div>
            </div>
            <div>
              <div className="text-gray-600">Status</div>
              <div className="font-semibold text-green-600">Active</div>
            </div>
          </div>
          {/* Real-time keystroke indicator */}
          <div className="mt-3 text-center">
            <div className="text-xs text-gray-500">
              {lastKeyPressed ? 
                `Last key: "${lastKeyPressed}"` : 
                'Start typing to see analysis...'
              }
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {keystrokeBuffer.current.length > 0 && `Total captured: ${keystrokeBuffer.current.length}`}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              // Stop tracking immediately
              stopTracking();
              // Call the callback to close the modal
              onAnalysisResult && onAnalysisResult({ action: 'close' });
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={false}
          >
            Close Tracking
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealTimeBehaviorTracker; 