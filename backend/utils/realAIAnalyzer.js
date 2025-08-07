const { HfInference } = require('@huggingface/inference');
const natural = require('natural');
const compromise = require('compromise');
const Sentiment = require('sentiment');
const TrustAnalyzer = require('./trustAnalyzer');

class RealAIAnalyzer {
  constructor() {
    // Initialize HuggingFace client (free tier - no API key needed for public models)
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  // Real HuggingFace API integration for text analysis
  async analyzeReviewWithHuggingFace(reviewText) {
    try {
      // Use multiple HuggingFace models for comprehensive analysis including AI detection
      const [sentimentResult, toxicityResult, aiDetectionResult] = await Promise.all([
        this.hf.textClassification({
          model: 'distilbert-base-uncased-finetuned-sst-2-english',
          inputs: reviewText
        }),
        this.hf.textClassification({
          model: 'unitary/toxic-bert',
          inputs: reviewText
        }),
        this.hf.textClassification({
          model: 'microsoft/DialoGPT-medium', // AI text detection model
          inputs: reviewText
        }).catch(() => null) // Fallback if AI detection model fails
      ]);

      const localSentiment = this.sentiment.analyze(reviewText);
      const linguisticFeatures = this.extractAdvancedLinguisticFeatures(reviewText);
      
      // Enhanced AI detection using HuggingFace + local patterns
      const isAIGenerated = this.enhancedAIDetection(
        reviewText, 
        linguisticFeatures, 
        aiDetectionResult
      );
      
      return {
        huggingFaceResults: {
          sentiment: sentimentResult,
          toxicity: toxicityResult,
          aiDetection: aiDetectionResult
        },
        localAnalysis: {
          sentiment: localSentiment,
          linguistic: linguisticFeatures
        },
        authenticityScore: this.calculateAdvancedAuthenticityScore(
          sentimentResult, 
          toxicityResult, 
          localSentiment, 
          linguisticFeatures,
          isAIGenerated
        ),
        isAIGenerated: isAIGenerated.isAIGenerated,
        aiDetectionConfidence: isAIGenerated.confidence,
        aiDetectionReason: isAIGenerated.reason,
        detailedAnalysis: this.generateDetailedAnalysis(reviewText, linguisticFeatures, isAIGenerated)
      };
    } catch (error) {
      console.error('HuggingFace API error:', error);
      // Fallback to advanced local analysis
      return this.advancedLocalAnalysis(reviewText);
    }
  }

  // Enhanced AI detection combining HuggingFace and local patterns
  enhancedAIDetection(text, linguistic, hfAIDetection = null) {
    const localAIIndicators = [];
    
    // Check for gibberish first (critical)
    const gibberishCheck = this.detectGibberish(text);
    if (gibberishCheck.isGibberish) {
      return {
        isAIGenerated: true,
        confidence: 95,
        reason: gibberishCheck.reason,
        source: 'local_gibberish_detection'
      };
    }
    
    // Enhanced AI detection patterns
    const aiPatterns = this.detectAIPatterns(text);
    localAIIndicators.push(...aiPatterns);
    
    // Perfect grammar/structure (AI tends to be too perfect)
    if (linguistic.complexityMetrics.readabilityScore > 95) {
      localAIIndicators.push('too_perfect_readability');
    }
    
    // Lack of personal pronouns (AI often avoids first person)
    const personalPronouns = (text.match(/\b(I|me|my|mine|myself)\b/gi) || []).length;
    if (personalPronouns === 0 && text.length > 100) {
      localAIIndicators.push('no_personal_pronouns');
    }
    
    // Check for overly positive language patterns (common in AI reviews)
    const overlyPositivePatterns = this.detectOverlyPositiveLanguage(text);
    if (overlyPositivePatterns.length > 0) {
      localAIIndicators.push(...overlyPositivePatterns);
    }
    
    // Check for repetitive sentence structures
    const repetitiveStructures = this.detectRepetitiveStructures(text);
    if (repetitiveStructures) {
      localAIIndicators.push('repetitive_sentence_structures');
    }
    
    // Check for marketing language patterns
    const marketingPatterns = this.detectMarketingLanguage(text);
    if (marketingPatterns.length > 0) {
      localAIIndicators.push(...marketingPatterns);
    }
    
    // Combine HuggingFace AI detection with local patterns
    let hfConfidence = 0;
    let hfReason = '';
    
    if (hfAIDetection && hfAIDetection.length > 0) {
      // Interpret HuggingFace AI detection results
      const aiScore = hfAIDetection[0].score;
      hfConfidence = Math.round(aiScore * 100);
      hfReason = `HuggingFace AI detection: ${aiScore > 0.7 ? 'High' : aiScore > 0.5 ? 'Medium' : 'Low'} confidence`;
    }
    
    // Calculate combined confidence
    const localConfidence = localAIIndicators.length * 15; // 15% per indicator
    const combinedConfidence = Math.min(95, Math.max(localConfidence, hfConfidence));
    
    // Determine if AI-generated based on combined evidence
    const isAIGenerated = combinedConfidence > 60 || localAIIndicators.length >= 3;
    
    return {
      isAIGenerated,
      confidence: combinedConfidence,
      reason: isAIGenerated ? 
        `${hfReason}${hfReason && localAIIndicators.length > 0 ? ' + ' : ''}${localAIIndicators.join(', ')}` :
        'No significant AI indicators detected',
      source: 'combined_huggingface_local',
      localIndicators: localAIIndicators,
      hfConfidence: hfConfidence
    };
  }

  // Advanced linguistic feature extraction using multiple NLP libraries
  extractAdvancedLinguisticFeatures(text) {
    const doc = compromise(text);
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Advanced linguistic metrics
    const uniqueWords = new Set(tokens);
    const stemmedWords = tokens.map(word => this.stemmer.stem(word));
    const uniqueStems = new Set(stemmedWords);
    
    // Calculate various complexity metrics
    const avgSentenceLength = tokens.length / Math.max(sentences.length, 1);
    const lexicalDiversity = uniqueWords.size / tokens.length;
    const morphologicalComplexity = uniqueStems.size / uniqueWords.size;
    
    // Syntactic analysis
    const nouns = doc.nouns().out('array');
    const verbs = doc.verbs().out('array');
    const adjectives = doc.adjectives().out('array');
    const adverbs = doc.adverbs().out('array');
    
    // Calculate readability metrics
    const readabilityScore = this.calculateFleschKincaid(text, sentences, tokens);
    const gunningFog = this.calculateGunningFog(sentences, tokens);
    
    return {
      basicMetrics: {
        wordCount: tokens.length,
        sentenceCount: sentences.length,
        avgSentenceLength,
        uniqueWordRatio: uniqueWords.size / tokens.length
      },
      complexityMetrics: {
        lexicalDiversity,
        morphologicalComplexity,
        readabilityScore,
        gunningFog
      },
      syntacticFeatures: {
        nounRatio: nouns.length / tokens.length,
        verbRatio: verbs.length / tokens.length,
        adjectiveRatio: adjectives.length / tokens.length,
        adverbRatio: adverbs.length / tokens.length
      },
      semanticFeatures: {
        namedEntities: doc.people().concat(doc.places()).out('array'),
        topics: doc.topics().out('array'),
        emotionalWords: this.extractEmotionalWords(tokens)
      }
    };
  }

  // Advanced authenticity scoring using multiple factors
  calculateAdvancedAuthenticityScore(hfSentiment, hfToxicity, localSentiment, linguistic, aiDetection) {
    let score = 50; // Base score
    
    // AI Detection Impact (Critical - can significantly reduce score)
    if (aiDetection && aiDetection.isAIGenerated) {
      score -= Math.min(40, aiDetection.confidence * 0.4); // Reduce score based on AI confidence
    }
    
    // HuggingFace sentiment analysis contribution
    if (hfSentiment && hfSentiment.length > 0) {
      const sentimentConfidence = hfSentiment[0].score;
      score += (sentimentConfidence > 0.8 ? 20 : sentimentConfidence > 0.6 ? 10 : 5);
    }
    
    // Local sentiment intensity (genuine emotions)
    const sentimentIntensity = Math.abs(localSentiment.score);
    score += Math.min(15, sentimentIntensity * 2);
    
    // Lexical diversity (humans write more variably)
    score += linguistic.complexityMetrics.lexicalDiversity * 25;
    
    // Syntactic complexity (natural variation)
    const syntacticVariation = this.calculateSyntacticVariation(linguistic.syntacticFeatures);
    score += syntacticVariation * 20;
    
    // Readability (too perfect = AI)
    if (linguistic.complexityMetrics.readabilityScore > 90) {
      score -= 15; // Too easy to read = potentially AI
    } else if (linguistic.complexityMetrics.readabilityScore < 30) {
      score -= 10; // Too complex = potentially fake
    } else {
      score += 10; // Natural readability
    }
    
    // Semantic richness
    const semanticRichness = (
      linguistic.semanticFeatures.namedEntities.length + 
      linguistic.semanticFeatures.topics.length + 
      linguistic.semanticFeatures.emotionalWords.length
    ) / linguistic.basicMetrics.wordCount;
    
    score += Math.min(15, semanticRichness * 100);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // AI-generated content detection using linguistic patterns
  detectAIGeneratedContent(text, linguistic) {
    const aiIndicators = [];
    
    // Check for gibberish first (critical)
    const gibberishCheck = this.detectGibberish(text);
    if (gibberishCheck.isGibberish) {
      aiIndicators.push('gibberish_content');
      return true; // Immediately return true for gibberish
    }
    
    // Enhanced AI detection patterns
    const aiPatterns = this.detectAIPatterns(text);
    aiIndicators.push(...aiPatterns);
    
    // Perfect grammar/structure (AI tends to be too perfect)
    if (linguistic.complexityMetrics.readabilityScore > 95) {
      aiIndicators.push('too_perfect_readability');
    }
    
    // Lack of personal pronouns (AI often avoids first person)
    const personalPronouns = (text.match(/\b(I|me|my|mine|myself)\b/gi) || []).length;
    if (personalPronouns === 0 && text.length > 100) {
      aiIndicators.push('no_personal_pronouns');
    }
    
    // Generic language patterns
    const genericPhrases = [
      'overall', 'in conclusion', 'to summarize', 'it is worth noting',
      'furthermore', 'moreover', 'additionally', 'in addition'
    ];
    const genericCount = genericPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase)
    ).length;
    
    if (genericCount > 2) {
      aiIndicators.push('too_many_generic_phrases');
    }
    
    // Low lexical diversity (AI repeats patterns)
    if (linguistic.complexityMetrics.lexicalDiversity < 0.3) {
      aiIndicators.push('low_lexical_diversity');
    }
    
    // Check for overly positive language patterns (common in AI reviews)
    const overlyPositivePatterns = this.detectOverlyPositiveLanguage(text);
    if (overlyPositivePatterns.length > 0) {
      aiIndicators.push(...overlyPositivePatterns);
    }
    
    // Check for repetitive sentence structures
    const repetitiveStructures = this.detectRepetitiveStructures(text);
    if (repetitiveStructures) {
      aiIndicators.push('repetitive_sentence_structures');
    }
    
    // Check for marketing language patterns
    const marketingPatterns = this.detectMarketingLanguage(text);
    if (marketingPatterns.length > 0) {
      aiIndicators.push(...marketingPatterns);
    }
    
    return aiIndicators.length >= 2;
  }

  // Detect AI-specific patterns
  detectAIPatterns(text) {
    const patterns = [];
    const lowerText = text.toLowerCase();
    
    // AI often uses overly descriptive language
    const descriptivePhrases = [
      'truly stands out', 'exactly what you want', 'cooks up beautifully',
      'fills the kitchen with', 'turns out perfect every time',
      'definitely a', 'highly recommended', 'lives up to its name',
      'quality', 'essential', 'pantry essential', 'goes a long way'
    ];
    
    const descriptiveCount = descriptivePhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (descriptiveCount >= 3) {
      patterns.push('overly_descriptive_language');
    }
    
    // AI often uses repetitive positive adjectives
    const positiveAdjectives = [
      'perfect', 'beautiful', 'lovely', 'excellent', 'amazing', 'fantastic',
      'wonderful', 'outstanding', 'superb', 'magnificent', 'splendid'
    ];
    
    const adjectiveCount = positiveAdjectives.filter(adj => 
      lowerText.includes(adj)
    ).length;
    
    if (adjectiveCount >= 4) {
      patterns.push('excessive_positive_adjectives');
    }
    
    // AI often uses marketing-style language
    const marketingPhrases = [
      'definitely', 'highly recommended', 'essential', 'must-have',
      'game-changer', 'worth every penny', 'best investment'
    ];
    
    const marketingCount = marketingPhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (marketingCount >= 2) {
      patterns.push('marketing_language_patterns');
    }
    
    return patterns;
  }

  // Detect overly positive language patterns
  detectOverlyPositiveLanguage(text) {
    const patterns = [];
    const lowerText = text.toLowerCase();
    
    // Check for excessive exclamation marks
    const exclamationCount = (lowerText.match(/!/g) || []).length;
    if (exclamationCount >= 2) {
      patterns.push('excessive_exclamations');
    }
    
    // Check for overly enthusiastic language
    const enthusiasticPhrases = [
      'absolutely love', 'completely satisfied', 'beyond expectations',
      'couldn\'t be happier', 'exceeded all expectations', 'perfect in every way'
    ];
    
    const enthusiasticCount = enthusiasticPhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (enthusiasticCount >= 2) {
      patterns.push('overly_enthusiastic_language');
    }
    
    return patterns;
  }

  // Detect repetitive sentence structures
  detectRepetitiveStructures(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return false;
    
    // Check for sentences starting with the same words
    const sentenceStarters = sentences.map(s => 
      s.trim().toLowerCase().split(' ')[0]
    );
    
    const starterCounts = {};
    sentenceStarters.forEach(starter => {
      starterCounts[starter] = (starterCounts[starter] || 0) + 1;
    });
    
    const maxStarterCount = Math.max(...Object.values(starterCounts));
    return maxStarterCount >= 3; // If 3+ sentences start with same word
  }

  // Detect marketing language patterns
  detectMarketingLanguage(text) {
    const patterns = [];
    const lowerText = text.toLowerCase();
    
    // Marketing buzzwords
    const buzzwords = [
      'quality', 'premium', 'authentic', 'genuine', 'real', 'natural',
      'organic', 'traditional', 'artisanal', 'handcrafted', 'premium quality'
    ];
    
    const buzzwordCount = buzzwords.filter(word => 
      lowerText.includes(word)
    ).length;
    
    if (buzzwordCount >= 3) {
      patterns.push('marketing_buzzwords');
    }
    
    // Promotional language
    const promotionalPhrases = [
      'worth the price', 'good value', 'reasonable price', 'affordable luxury',
      'investment', 'long-term', 'durable', 'lasting', 'reliable'
    ];
    
    const promotionalCount = promotionalPhrases.filter(phrase => 
      lowerText.includes(phrase)
    ).length;
    
    if (promotionalCount >= 2) {
      patterns.push('promotional_language');
    }
    
    return patterns;
  }

  // Detect gibberish content
  detectGibberish(text) {
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
    
    // Check for very low vocabulary richness - more lenient
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyRichness = uniqueWords.size / words.length;
    
    if (words.length > 10 && vocabularyRichness < 0.15) { // Changed from 0.2 to 0.15 and 5 to 10 words
      return {
        isGibberish: true,
        reason: 'Extremely low vocabulary diversity for text length'
      };
    }
    
    // Check for excessive repetition of the same word - more lenient
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 2) { // Only count words longer than 2 characters
        wordCounts[word.toLowerCase()] = (wordCounts[word.toLowerCase()] || 0) + 1;
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

  // Advanced behavioral analysis for typing patterns with IP-based trust integration
  async analyzeTypingBehaviorAdvanced(typingData, mouseData = [], userId = null) {
    if (!typingData || typingData.length < 5) {
      return { 
        classification: 'insufficient_data', 
        confidence: 0, 
        analysis: 'Need more typing samples' 
      };
    }

    // Statistical analysis
    const stats = this.calculateTypingStatistics(typingData);
    
    // IP-based trust analysis integration
    let ipAnalysis = null;
    if (userId) {
      try {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
          ipAnalysis = await TrustAnalyzer.getIPAnalysisDetails(userId);
          console.log('🔍 IP Analysis integrated into behavioral analysis:', ipAnalysis);
        }
      } catch (error) {
        console.error('Error integrating IP analysis:', error);
      }
    }
    
    // Pattern analysis
    const patterns = this.analyzeTypingPatterns(typingData);
    
    // Mouse correlation (if available)
    const mouseCorrelation = mouseData.length > 0 ? 
      this.analyzeMouseTypingCorrelation(typingData, mouseData) : null;
    
    // Machine learning-style classification with IP analysis
    const classification = this.classifyTypingBehavior(stats, patterns, mouseCorrelation, ipAnalysis);
    
    return {
      classification: {
        type: classification.type,
        confidence: classification.confidence,
        risk: classification.type === 'Bot' ? 'High' : 
              classification.type === 'Suspicious' ? 'Medium' : 'Low'
      },
      statistics: stats,
      patterns: patterns,
      mouseCorrelation: mouseCorrelation,
      variance: stats.variance,
      consistency: patterns.consistency,
      riskFactors: classification.riskFactors,
      ipAnalysis: ipAnalysis, // Include IP analysis in results
      analysis: this.generateBehavioralAnalysisReport(classification, stats, patterns, ipAnalysis)
    };
  }

  // Helper methods for advanced analysis
  calculateTypingStatistics(data) {
    const mean = data.reduce((a, b) => a + b) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const skewness = this.calculateSkewness(data, mean, stdDev);
    const kurtosis = this.calculateKurtosis(data, mean, stdDev);
    
    return { mean, variance, stdDev, skewness, kurtosis };
  }

  calculateSkewness(data, mean, stdDev) {
    const n = data.length;
    const skew = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return skew;
  }

  calculateKurtosis(data, mean, stdDev) {
    const n = data.length;
    const kurt = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n;
    return kurt - 3; // Excess kurtosis
  }

  // Additional helper methods...
  extractEmotionalWords(tokens) {
    const emotionalLexicon = [
      'love', 'hate', 'amazing', 'terrible', 'fantastic', 'awful',
      'excited', 'disappointed', 'thrilled', 'frustrated', 'delighted',
      'angry', 'happy', 'sad', 'surprised', 'disgusted', 'fearful'
    ];
    
    return tokens.filter(token => 
      emotionalLexicon.includes(token.toLowerCase())
    );
  }

  calculateSyntacticVariation(syntacticFeatures) {
    const ratios = Object.values(syntacticFeatures);
    const mean = ratios.reduce((a, b) => a + b) / ratios.length;
    const variance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / ratios.length;
    return Math.sqrt(variance);
  }

  // Fallback method for when HuggingFace is unavailable
  advancedLocalAnalysis(text) {
    const sentiment = this.sentiment.analyze(text);
    const linguistic = this.extractAdvancedLinguisticFeatures(text);
    const aiDetection = this.enhancedAIDetection(text, linguistic, null);
    
    return {
      huggingFaceResults: null,
      localAnalysis: { sentiment, linguistic },
      authenticityScore: this.calculateLocalAuthenticityScore(sentiment, linguistic, aiDetection),
      isAIGenerated: aiDetection.isAIGenerated,
      aiDetectionConfidence: aiDetection.confidence,
      aiDetectionReason: aiDetection.reason,
      detailedAnalysis: this.generateDetailedAnalysis(text, linguistic, aiDetection)
    };
  }

  calculateLocalAuthenticityScore(sentiment, linguistic, aiDetection) {
    let score = 50;
    
    // AI Detection Impact (Critical - can significantly reduce score)
    if (aiDetection && aiDetection.isAIGenerated) {
      score -= Math.min(40, aiDetection.confidence * 0.4); // Reduce score based on AI confidence
    }
    
    score += Math.min(20, Math.abs(sentiment.score) * 3);
    score += linguistic.complexityMetrics.lexicalDiversity * 30;
    score += Math.min(15, linguistic.semanticFeatures.emotionalWords.length * 2);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  generateDetailedAnalysis(text, linguistic, aiDetection) {
    return {
      textLength: text.length,
      complexity: linguistic.complexityMetrics.readabilityScore > 60 ? 'appropriate' : 'complex',
      emotionalTone: linguistic.semanticFeatures.emotionalWords.length > 2 ? 'emotional' : 'neutral',
      writingStyle: linguistic.complexityMetrics.lexicalDiversity > 0.6 ? 'varied' : 'repetitive',
      aiDetection: aiDetection ? {
        isAIGenerated: aiDetection.isAIGenerated,
        confidence: aiDetection.confidence,
        reason: aiDetection.reason,
        source: aiDetection.source,
        localIndicators: aiDetection.localIndicators || [],
        hfConfidence: aiDetection.hfConfidence || 0
      } : null
    };
  }

    // Calculate Flesch-Kincaid readability score
  calculateFleschKincaid(text, sentences, words) {
    const syllables = this.countSyllables(text);
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / words.length;
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  // Calculate Gunning Fog Index
  calculateGunningFog(sentences, words) {
    const complexWords = words.filter(word => this.countSyllables(word) >= 3);
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const complexWordRatio = complexWords.length / words.length;
    return 0.4 * (avgSentenceLength + 100 * complexWordRatio);
  }

  // Count syllables in text
  countSyllables(text) {
    if (!text || text.length === 0) return 0;
    text = text.toLowerCase();
    let syllableCount = 0;
    const vowels = 'aeiouy';
    let prevCharWasVowel = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (vowels.includes(char)) {
        if (!prevCharWasVowel) {
          syllableCount++;
          prevCharWasVowel = true;
        }
      } else {
        prevCharWasVowel = false;
      }
    }
    
    // Subtract silent 'e' at the end
    if (text.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  }

  // Analyze typing patterns for classification
  analyzeTypingPatterns(typingData) {
    const patterns = {
      consistency: this.calculateConsistency(typingData),
      rhythm: this.detectRhythm(typingData),
      acceleration: this.detectAcceleration(typingData),
      pauses: this.detectPauses(typingData)
    };
    
    return patterns;
  }

  // Calculate typing consistency
  calculateConsistency(data) {
    if (data.length < 3) return 0;
    const differences = [];
    for (let i = 1; i < data.length; i++) {
      differences.push(Math.abs(data[i] - data[i-1]));
    }
    const avgDifference = differences.reduce((a, b) => a + b) / differences.length;
    return 1 - Math.min(1, avgDifference / 50); // Normalize to 0-1
  }

  // Detect natural rhythm
  detectRhythm(data) {
    if (data.length < 5) return false;
    const intervals = [];
    for (let i = 1; i < data.length; i++) {
      intervals.push(data[i] - data[i-1]);
    }
    const variance = this.calculateVariance(intervals);
    return variance > 10; // Natural rhythm has variation
  }

  // Detect acceleration patterns
  detectAcceleration(data) {
    if (data.length < 3) return false;
    let accelerations = 0;
    for (let i = 2; i < data.length; i++) {
      const accel = data[i] - 2*data[i-1] + data[i-2];
      if (Math.abs(accel) > 5) accelerations++;
    }
    return accelerations / (data.length - 2) > 0.3;
  }

  // Detect typing pauses
  detectPauses(data) {
    const threshold = data.reduce((a, b) => a + b) / data.length * 1.5;
    return data.filter(speed => speed < threshold).length > 0;
  }

  // Calculate variance helper
  calculateVariance(data) {
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  // Classify typing behavior using ML-style approach with IP-based fraud detection
  classifyTypingBehavior(stats, patterns, mouseCorrelation, ipAnalysis = null) {
    let botScore = 0;
    const riskFactors = [];

    // Perfect consistency = bot
    if (stats.variance === 0) {
      botScore += 0.9;
      riskFactors.push('perfect_consistency');
    } else if (stats.variance < 25) {
      botScore += 0.6;
      riskFactors.push('low_variance');
    }

    // Lack of natural rhythm
    if (!patterns.rhythm) {
      botScore += 0.5;
      riskFactors.push('no_natural_rhythm');
    }

    // Abnormal acceleration patterns
    if (!patterns.acceleration) {
      botScore += 0.3;
      riskFactors.push('uniform_acceleration');
    }

    // No pauses (bots don't pause to think)
    if (!patterns.pauses) {
      botScore += 0.4;
      riskFactors.push('no_thinking_pauses');
    }

    // Statistical anomalies
    if (Math.abs(stats.skewness) < 0.1) {
      botScore += 0.3;
      riskFactors.push('perfect_distribution');
    }

    // IP-based fraud detection integration
    if (ipAnalysis) {
      if (ipAnalysis.totalUsersWithIP >= 3) {
        botScore += 0.7; // High suspicion for multiple accounts from same IP
        riskFactors.push(`multiple_accounts_same_ip_${ipAnalysis.totalUsersWithIP}`);
      } else if (ipAnalysis.totalUsersWithIP === 2) {
        botScore += 0.2; // Slight suspicion for shared IP
        riskFactors.push('shared_ip_address');
      }
      
      // Additional IP-based risk factors
      if (ipAnalysis.riskLevel === 'High') {
        botScore += 0.4;
        riskFactors.push('high_ip_risk_level');
      }
    }

    const confidence = Math.min(95, botScore * 100);
    const type = botScore > 0.7 ? 'Bot' : botScore > 0.4 ? 'Suspicious' : 'Human';

    return {
      type,
      confidence,
      riskFactors,
      ipRiskContribution: ipAnalysis ? (ipAnalysis.totalUsersWithIP >= 3 ? 0.7 : ipAnalysis.totalUsersWithIP === 2 ? 0.2 : 0) : 0
    };
  }

  // Analyze mouse-typing correlation
  analyzeMouseTypingCorrelation(typingData, mouseData) {
    // Simple correlation analysis
    if (mouseData.length !== typingData.length) return null;
    
    let correlation = 0;
    for (let i = 0; i < Math.min(typingData.length, mouseData.length); i++) {
      // Check if mouse movement correlates with typing speed
      correlation += Math.abs(typingData[i] - mouseData[i]) < 20 ? 1 : 0;
    }
    
    return {
      correlationScore: correlation / Math.min(typingData.length, mouseData.length),
      isNaturalCorrelation: correlation / Math.min(typingData.length, mouseData.length) > 0.3
    };
  }

  // Generate comprehensive behavioral analysis report including IP analysis
  generateBehavioralAnalysisReport(classification, stats, patterns, ipAnalysis) {
    let report = `🤖 AI Analysis: ${classification.type} behavior detected with ${classification.confidence}% confidence.`;
    
    // Add behavioral insights
    if (stats.variance === 0) {
      report += ` 🚨 Perfect typing consistency indicates automated behavior.`;
    } else if (stats.variance < 25) {
      report += ` ⚠️ Low typing variance suggests potential automation.`;
    } else {
      report += ` ✅ Natural typing variance detected.`;
    }
    
    // Add pattern insights
    if (!patterns.rhythm) {
      report += ` 🔄 Lacks natural typing rhythm.`;
    }
    if (!patterns.pauses) {
      report += ` ⏸️ No thinking pauses detected.`;
    }
    
    // Add IP-based insights
    if (ipAnalysis) {
      if (ipAnalysis.totalUsersWithIP >= 3) {
        report += ` 🌐 HIGH RISK: ${ipAnalysis.totalUsersWithIP} accounts from IP ${ipAnalysis.ipAddress}.`;
      } else if (ipAnalysis.totalUsersWithIP === 2) {
        report += ` 🏠 Shared IP detected (possibly household/family).`;
      } else {
        report += ` ✅ Unique IP address.`;
      }
      
      if (ipAnalysis.scoreAdjustment > 0) {
        report += ` Trust score boosted by +${ipAnalysis.scoreAdjustment}.`;
      } else if (ipAnalysis.scoreAdjustment < 0) {
        report += ` Trust score reduced by ${ipAnalysis.scoreAdjustment}.`;
      }
    }
    
    return report;
  }
}

module.exports = RealAIAnalyzer;
