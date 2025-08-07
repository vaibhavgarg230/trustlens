const crypto = require('crypto');

class LinguisticAnalyzer {
  constructor() {
    this.commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    this.positiveWords = new Set(['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'perfect', 'best', 'nice', 'beautiful', 'quality', 'recommend', 'happy', 'satisfied', 'pleased', 'impressed']);
    this.negativeWords = new Set(['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointed', 'poor', 'cheap', 'fake', 'broken', 'useless', 'waste', 'regret', 'angry', 'frustrated']);
    this.spamIndicators = new Set(['buy now', 'click here', 'limited time', 'special offer', 'guaranteed', 'free shipping', 'discount', 'sale', 'promotion']);
  }

  // Generate linguistic fingerprint for a review
  generateLinguisticFingerprint(reviewText, behaviorMetrics = {}) {
    const text = reviewText.toLowerCase().trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Basic text metrics
    const metrics = {
      characterCount: text.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: words.length / Math.max(sentences.length, 1),
      avgCharsPerWord: text.replace(/\s/g, '').length / Math.max(words.length, 1)
    };

    // Vocabulary analysis
    const uniqueWords = new Set(words);
    const vocabularyRichness = uniqueWords.size / Math.max(words.length, 1);
    
    // Common words ratio
    const commonWordsCount = words.filter(word => this.commonWords.has(word)).length;
    const commonWordsRatio = commonWordsCount / Math.max(words.length, 1);

    // Sentiment analysis
    const positiveCount = words.filter(word => this.positiveWords.has(word)).length;
    const negativeCount = words.filter(word => this.negativeWords.has(word)).length;
    const sentimentScore = (positiveCount - negativeCount) / Math.max(words.length, 1);

    // Spam indicators
    const spamCount = this.spamIndicators.size > 0 ? 
      Array.from(this.spamIndicators).filter(phrase => text.includes(phrase)).length : 0;

    // Punctuation analysis
    const punctuationMarks = text.match(/[.,!?;:]/g) || [];
    const punctuationDensity = punctuationMarks.length / Math.max(text.length, 1);

    // Capitalization patterns
    const capitalLetters = (reviewText.match(/[A-Z]/g) || []).length;
    const capitalizationRatio = capitalLetters / Math.max(reviewText.length, 1);

    // Repetition analysis
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    const maxWordFrequency = Math.max(...Object.values(wordFrequency));
    const repetitionScore = maxWordFrequency / Math.max(words.length, 1);

    // Behavioral metrics integration
    const writingSpeed = behaviorMetrics.writingTime ? 
      words.length / (behaviorMetrics.writingTime / 1000 / 60) : 0; // words per minute

    const fingerprint = {
      // Store original text for gibberish detection
      originalText: text,
      
      // Basic metrics
      ...metrics,
      
      // Advanced linguistic features
      vocabularyRichness,
      commonWordsRatio,
      sentimentScore,
      punctuationDensity,
      capitalizationRatio,
      repetitionScore,
      spamIndicators: spamCount,
      
      // Behavioral integration
      writingSpeed,
      revisionsCount: behaviorMetrics.revisionsCount || 0,
      sessionDuration: behaviorMetrics.sessionDuration || 0,
      imageCount: behaviorMetrics.imageCount || 0,
      
      // Temporal patterns
      timestamp: Date.now(),
      dayOfWeek: new Date().getDay(),
      hourOfDay: new Date().getHours(),
      
      // Unique identifiers
      textHash: crypto.createHash('md5').update(text).digest('hex'),
      fingerprintId: crypto.randomUUID()
    };

    return fingerprint;
  }

  // Calculate authenticity score based on multiple factors
  calculateAuthenticityScore(fingerprint, userHistory = {}, orderData = {}) {
    let score = 100; // Start with perfect score
    let flags = [];
    let reasons = [];

    // 0. Gibberish Detection (Critical - 30 points)
    const isGibberish = this.detectGibberish(fingerprint);
    if (isGibberish.isGibberish) {
      score -= 30;
      flags.push('GIBBERISH_CONTENT');
      reasons.push(isGibberish.reason);
    }

    // 0.5. AI-Generated Content Detection (Critical - 25 points)
    const aiDetection = this.detectAIGeneratedContent(fingerprint);
    if (aiDetection.isAIGenerated) {
      score -= 25;
      flags.push('AI_GENERATED_CONTENT');
      reasons.push(aiDetection.reason);
    }

    // 1. Text Quality Analysis (25 points)
    if (fingerprint.wordCount < 10) {
      score -= 15;
      flags.push('SHORT_REVIEW');
      reasons.push('Review too short (less than 10 words)');
    }

    if (fingerprint.vocabularyRichness < 0.3) {
      score -= 10;
      flags.push('LOW_VOCABULARY');
      reasons.push('Limited vocabulary diversity');
    }

    if (fingerprint.repetitionScore > 0.3) {
      score -= 8;
      flags.push('HIGH_REPETITION');
      reasons.push('Excessive word repetition detected');
    }

    // 2. Sentiment Analysis (20 points)
    if (Math.abs(fingerprint.sentimentScore) > 0.5) {
      score -= 5;
      flags.push('EXTREME_SENTIMENT');
      reasons.push('Extremely polarized sentiment');
    }

    if (fingerprint.spamIndicators > 0) {
      score -= 15;
      flags.push('SPAM_INDICATORS');
      reasons.push('Contains promotional language');
    }

    // 3. Behavioral Analysis (25 points)
    if (fingerprint.writingSpeed > 100) { // More than 100 WPM is suspicious
      score -= 12;
      flags.push('FAST_TYPING');
      reasons.push('Unusually fast typing speed');
    }

    if (fingerprint.revisionsCount < 2 && fingerprint.wordCount > 50) {
      score -= 8;
      flags.push('NO_REVISIONS');
      reasons.push('No text revisions for lengthy review');
    }

    if (fingerprint.sessionDuration < 30000 && fingerprint.wordCount > 30) { // Less than 30 seconds
      score -= 10;
      flags.push('RUSHED_WRITING');
      reasons.push('Review written too quickly');
    }

    // 4. Temporal Patterns (15 points)
    if (fingerprint.hourOfDay >= 2 && fingerprint.hourOfDay <= 5) {
      score -= 5;
      flags.push('UNUSUAL_TIME');
      reasons.push('Review submitted at unusual hours');
    }

    // 5. User History Analysis (15 points)
    if (userHistory.totalReviews > 10 && userHistory.avgReviewLength) {
      const lengthDeviation = Math.abs(fingerprint.wordCount - userHistory.avgReviewLength) / userHistory.avgReviewLength;
      if (lengthDeviation > 2) {
        score -= 8;
        flags.push('LENGTH_ANOMALY');
        reasons.push('Review length significantly different from user pattern');
      }
    }

    if (userHistory.recentReviewCount > 5) { // More than 5 reviews in recent period
      score -= 7;
      flags.push('HIGH_ACTIVITY');
      reasons.push('Unusually high review activity');
    }

    // 6. Purchase Verification Bonus
    if (orderData.purchaseVerified) {
      score += 10;
      reasons.push('Purchase verified - authenticity bonus');
    }

    if (orderData.orderTrustScore > 70) {
      score += 5;
      reasons.push('High order trust score');
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    let riskLevel = 'Low';
    if (score < 40) riskLevel = 'High';
    else if (score < 70) riskLevel = 'Medium';

    return {
      authenticityScore: Math.round(score),
      riskLevel,
      flags,
      reasons,
      analysis: {
        textQuality: Math.max(0, 100 - (flags.filter(f => ['SHORT_REVIEW', 'LOW_VOCABULARY', 'HIGH_REPETITION'].includes(f)).length * 10)),
        sentimentAnalysis: Math.max(0, 100 - (flags.filter(f => ['EXTREME_SENTIMENT', 'SPAM_INDICATORS'].includes(f)).length * 10)),
        behavioralConsistency: Math.max(0, 100 - (flags.filter(f => ['FAST_TYPING', 'NO_REVISIONS', 'RUSHED_WRITING'].includes(f)).length * 10)),
        temporalPatterns: Math.max(0, 100 - (flags.filter(f => ['UNUSUAL_TIME'].includes(f)).length * 20)),
        userConsistency: Math.max(0, 100 - (flags.filter(f => ['LENGTH_ANOMALY', 'HIGH_ACTIVITY'].includes(f)).length * 15))
      }
    };
  }

  // Compare fingerprints to detect similar writing patterns
  compareFingerprints(fingerprint1, fingerprint2) {
    const features = [
      'vocabularyRichness', 'commonWordsRatio', 'sentimentScore',
      'punctuationDensity', 'capitalizationRatio', 'avgWordsPerSentence',
      'avgCharsPerWord', 'writingSpeed'
    ];

    let similarity = 0;
    let validFeatures = 0;

    features.forEach(feature => {
      if (fingerprint1[feature] !== undefined && fingerprint2[feature] !== undefined) {
        const diff = Math.abs(fingerprint1[feature] - fingerprint2[feature]);
        const maxVal = Math.max(fingerprint1[feature], fingerprint2[feature], 0.01);
        const featureSimilarity = 1 - (diff / maxVal);
        similarity += Math.max(0, featureSimilarity);
        validFeatures++;
      }
    });

    return validFeatures > 0 ? similarity / validFeatures : 0;
  }

  // Detect gibberish content
  detectGibberish(fingerprint) {
    const text = fingerprint.originalText || '';
    
    // Only check for gibberish if text is long enough to be suspicious
    if (text.length < 10) {
      return {
        isGibberish: false,
        reason: null
      };
    }
    
    // Check for excessive character repetition (like "asdbsfbsf") - more specific
    const charRepetition = /([a-zA-Z])\1{4,}/g; // Changed from 3 to 4 repetitions
    if (charRepetition.test(text)) {
      return {
        isGibberish: true,
        reason: 'Excessive character repetition detected (e.g., "asdbsfbsf")'
      };
    }
    
    // Check for keyboard smashing patterns - more specific
    const keyboardSmash = /(qwerty|asdfgh|zxcvbn|qazwsx|edcrfv|tgbyhn|ujmikl|oplp;)/gi;
    if (keyboardSmash.test(text.toLowerCase())) {
      return {
        isGibberish: true,
        reason: 'Keyboard smashing pattern detected'
      };
    }
    
    // Check for very low vocabulary richness with sufficient length - more lenient
    if (fingerprint.wordCount > 10 && fingerprint.vocabularyRichness < 0.15) { // Changed from 0.2 to 0.15 and 5 to 10 words
      return {
        isGibberish: true,
        reason: 'Extremely low vocabulary diversity for text length'
      };
    }
    
    // Check for excessive repetition of the same word - more lenient
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 2) { // Only count words longer than 2 characters
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    const maxRepetition = Math.max(...Object.values(wordCounts));
    if (maxRepetition > words.length * 0.5) { // Changed from 0.4 to 0.5
      return {
        isGibberish: true,
        reason: 'Excessive repetition of the same word'
      };
    }
    
    // Check for non-English character patterns - more lenient
    const nonEnglishRatio = (text.replace(/[a-zA-Z\s.,!?]/g, '').length / text.length);
    if (nonEnglishRatio > 0.5) { // Changed from 0.3 to 0.5
      return {
        isGibberish: true,
        reason: 'High ratio of non-English characters'
      };
    }
    
    // Check for alternating consonant-vowel patterns that are too regular - more specific
    const alternatingPattern = /([bcdfghjklmnpqrstvwxyz][aeiou]){6,}/gi; // Changed from 4 to 6
    if (alternatingPattern.test(text.toLowerCase())) {
      return {
        isGibberish: true,
        reason: 'Suspicious alternating consonant-vowel pattern'
      };
    }
    
    // Check for random character sequences - more specific
    const randomCharPattern = /[a-zA-Z]{3,}[bcdfghjklmnpqrstvwxyz]{5,}/g; // Made more specific
    if (randomCharPattern.test(text.toLowerCase())) {
      return {
        isGibberish: true,
        reason: 'Random character sequence pattern detected'
      };
    }
    
    return {
      isGibberish: false,
      reason: null
    };
  }

  // Detect AI-generated content patterns
  detectAIGeneratedContent(fingerprint) {
    const text = fingerprint.originalText || '';
    const lowerText = text.toLowerCase();
    
    // Check for overly descriptive language (common in AI reviews)
    const descriptivePhrases = [
      'truly stands out', 'exactly what you want', 'cooks up beautifully',
      'fills the kitchen with', 'turns out perfect every time',
      'definitely a', 'highly recommended', 'lives up to its name',
      'quality', 'essential', 'pantry essential', 'goes a long way',
      'perfect every time', 'beautifully', 'lovely', 'nutty aroma'
    ];
    
    const descriptiveCount = descriptivePhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (descriptiveCount >= 3) {
      return {
        isAIGenerated: true,
        reason: 'Overly descriptive marketing language detected'
      };
    }
    
    // Check for excessive positive adjectives
    const positiveAdjectives = [
      'perfect', 'beautiful', 'lovely', 'excellent', 'amazing', 'fantastic',
      'wonderful', 'outstanding', 'superb', 'magnificent', 'splendid',
      'fragrant', 'fluffy', 'nutty', 'aromatic'
    ];
    
    const adjectiveCount = positiveAdjectives.filter(adj => 
      lowerText.includes(adj)
    ).length;
    
    if (adjectiveCount >= 4) {
      return {
        isAIGenerated: true,
        reason: 'Excessive positive adjectives detected'
      };
    }
    
    // Check for marketing-style language
    const marketingPhrases = [
      'definitely', 'highly recommended', 'essential', 'must-have',
      'game-changer', 'worth every penny', 'best investment',
      'pantry essential', 'lives up to its name'
    ];
    
    const marketingCount = marketingPhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (marketingCount >= 2) {
      return {
        isAIGenerated: true,
        reason: 'Marketing language patterns detected'
      };
    }
    
    // Check for repetitive sentence structures
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3) {
      const sentenceStarters = sentences.map(s => 
        s.trim().toLowerCase().split(' ')[0]
      );
      
      const starterCounts = {};
      sentenceStarters.forEach(starter => {
        starterCounts[starter] = (starterCounts[starter] || 0) + 1;
      });
      
      const maxStarterCount = Math.max(...Object.values(starterCounts));
      if (maxStarterCount >= 3) {
        return {
          isAIGenerated: true,
          reason: 'Repetitive sentence structures detected'
        };
      }
    }
    
    // Check for overly enthusiastic language
    const enthusiasticPhrases = [
      'absolutely love', 'completely satisfied', 'beyond expectations',
      'couldn\'t be happier', 'exceeded all expectations', 'perfect in every way',
      'definitely a pantry essential', 'highly recommended'
    ];
    
    const enthusiasticCount = enthusiasticPhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (enthusiasticCount >= 2) {
      return {
        isAIGenerated: true,
        reason: 'Overly enthusiastic language detected'
      };
    }
    
    return {
      isAIGenerated: false,
      reason: null
    };
  }

  // Detect potential fake review patterns
  detectFakePatterns(fingerprints) {
    const patterns = {
      duplicateContent: [],
      similarWritingStyles: [],
      temporalClustering: [],
      behavioralAnomalies: []
    };

    // Check for duplicate or very similar content
    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const similarity = this.compareFingerprints(fingerprints[i], fingerprints[j]);
        if (similarity > 0.85) {
          patterns.similarWritingStyles.push({
            fingerprint1: fingerprints[i].fingerprintId,
            fingerprint2: fingerprints[j].fingerprintId,
            similarity
          });
        }

        if (fingerprints[i].textHash === fingerprints[j].textHash) {
          patterns.duplicateContent.push({
            fingerprint1: fingerprints[i].fingerprintId,
            fingerprint2: fingerprints[j].fingerprintId
          });
        }
      }
    }

    // Check for temporal clustering (multiple reviews in short time)
    const timeGroups = {};
    fingerprints.forEach(fp => {
      const timeSlot = Math.floor(fp.timestamp / (30 * 60 * 1000)); // 30-minute slots
      if (!timeGroups[timeSlot]) timeGroups[timeSlot] = [];
      timeGroups[timeSlot].push(fp.fingerprintId);
    });

    Object.values(timeGroups).forEach(group => {
      if (group.length > 3) {
        patterns.temporalClustering.push({
          timeSlot: group[0],
          count: group.length,
          fingerprints: group
        });
      }
    });

    return patterns;
  }
}

module.exports = LinguisticAnalyzer; 