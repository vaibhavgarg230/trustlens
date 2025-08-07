import React from 'react';

export default function ReviewAnalysisResults({ analysisData, onClose }) {
  if (!analysisData) return null;

  const { 
    linguisticFingerprint, 
    aiAnalysisResults, 
    enhancedAuthentication 
  } = analysisData;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Review Analysis Results</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        {/* Fallback warning */}
        {analysisData?.aiAnalysisResults?.huggingFaceResults === null && (
          <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
             AI analysis is using fallback logic. Results may not be accurate.
          </div>
        )}

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-green-600 text-2xl mr-3">✅</div>
            <div>
              <h4 className="font-medium text-green-900">
                {analysisData.isUpdate ? 'Review Updated Successfully!' : 'Review Submitted Successfully!'}
              </h4>
              <p className="text-sm text-green-700">
                Your review has been analyzed using advanced AI and linguistic fingerprinting technology.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authenticity Analysis */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="font-bold text-blue-900 mb-4 flex items-center">
              <span className="text-2xl mr-2"></span>
              Authenticity Analysis
            </h4>
            
            {linguisticFingerprint && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full ${getScoreColor(linguisticFingerprint.authenticityScore)}`}>
                    <span className="text-2xl font-bold">{linguisticFingerprint.authenticityScore}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Authenticity Score</p>
                </div>

                <div className="text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(linguisticFingerprint.riskLevel)}`}>
                    {linguisticFingerprint.riskLevel} Risk
                  </span>
                </div>

                {linguisticFingerprint.analysis && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Analysis Breakdown:</h5>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Text Quality:</span>
                        <span className="font-medium">{linguisticFingerprint.analysis.textQuality}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sentiment Analysis:</span>
                        <span className="font-medium">{linguisticFingerprint.analysis.sentimentAnalysis}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Behavioral Consistency:</span>
                        <span className="font-medium">{linguisticFingerprint.analysis.behavioralConsistency}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temporal Patterns:</span>
                        <span className="font-medium">{linguisticFingerprint.analysis.temporalPatterns}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>User Consistency:</span>
                        <span className="font-medium">{linguisticFingerprint.analysis.userConsistency}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Analysis */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h4 className="font-bold text-purple-900 mb-4 flex items-center">
              <span className="text-2xl mr-2"></span>
              AI Content Analysis
            </h4>
            
            {aiAnalysisResults && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full ${getScoreColor(aiAnalysisResults.authenticityScore)}`}>
                    <span className="text-2xl font-bold">{aiAnalysisResults.authenticityScore}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">AI Authenticity Score</p>
                </div>

                <div className="text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    aiAnalysisResults.isAIGenerated ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
                  }`}>
                    {aiAnalysisResults.isAIGenerated ? 'AI Generated' : 'Human Written'}
                  </span>
                </div>

                {aiAnalysisResults.detailedAnalysis && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Analysis Source:</p>
                    <p>{aiAnalysisResults.huggingFaceResults ? 'HuggingFace AI Model' : 'Local Analysis'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flags and Warnings */}
        {linguisticFingerprint?.flags && linguisticFingerprint.flags.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Analysis Flags:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {linguisticFingerprint.flags.map((flag, index) => (
                <div key={index} className="flex items-center text-sm text-yellow-700">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                  {flag.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Authentication */}
        {enhancedAuthentication && !enhancedAuthentication.error && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Enhanced Authentication:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Overall Score:</span>
                <span className="font-medium ml-2">{enhancedAuthentication.overallScore}%</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="font-medium ml-2">{enhancedAuthentication.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Workflow Stage:</span>
                <span className="font-medium ml-2">{enhancedAuthentication.workflowStage}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fingerprint ID */}
        {linguisticFingerprint?.fingerprintId && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Linguistic Fingerprint:</h4>
            <div className="text-sm text-gray-600 font-mono">
              ID: {linguisticFingerprint.fingerprintId}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This unique identifier helps track writing patterns and detect potential fraud.
            </p>
          </div>
        )}

        {/* Trust & Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 text-xl"></div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Trust & Security</h4>
              <p className="text-sm text-blue-700">
                Your review has been processed through multiple layers of security analysis including:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Linguistic fingerprinting for authenticity verification</li>
                <li>• AI-powered content analysis using HuggingFace models</li>
                <li>• Behavioral pattern analysis and fraud detection</li>
                <li>• Purchase verification and order trust scoring</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
} 