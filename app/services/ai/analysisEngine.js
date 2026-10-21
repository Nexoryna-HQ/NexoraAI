const { blockedModelText } = require("./aiGuard")

const DISCLAIMER = "Not financial advice."
const RUBY_VOTES = 250
const DIAMOND_VOTES = 500
const VOTE_ETH = "0.0035"
const RUBY_ETH = "0.5"
const DIAMOND_ETH = "1"
const ALLOWED_CONSTANTS = [String(RUBY_VOTES), String(DIAMOND_VOTES), VOTE_ETH, RUBY_ETH, DIAMOND_ETH]

const BANNED = [
  /will (increase|rise|pump|moon|go up|soar)/i,
  /guaranteed/i,
  /partnership/i,
  /\bholders?\b/i,
  /\busers?\b/i,
  /price target/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /<[^>]+>/,
]

function shown(value) {
  return value == null ? "unavailable" : String(value)
}

function section(observed, interpretation) {
  return { observed, interpretation }
}

function listingProgress(intel) {
  if (intel.voteCount == null || intel.tier == null) {
    return {
      currentTier: null,
      nextTier: null,
      voteCount: null,
      votesRequiredForNextTier: null,
      votesRemaining: null,
      ethAlternative: null,
      perVoteEth: VOTE_ETH,
      observed: "Vote count is unavailable, so tier progress cannot be calculated.",
      interpretation:
        "No tier is assigned when the vote count is missing. Platform thresholds are " +
        RUBY_VOTES +
        " votes or " +
        RUBY_ETH +
        " ETH for Ruby, and " +
        DIAMOND_VOTES +
        " votes or " +
        DIAMOND_ETH +
        " ETH for Diamond. These are catalog rules, not a payment record. " +
        DISCLAIMER,
    }
  }

  let nextTier = null
  let required = null
  let ethAlternative = null
  if (intel.tier === "emerald") {
    nextTier = "ruby"
    required = RUBY_VOTES
    ethAlternative = RUBY_ETH
  } else if (intel.tier === "ruby") {
    nextTier = "diamond"
    required = DIAMOND_VOTES
    ethAlternative = DIAMOND_ETH
  }

  const remaining = required == null ? null : Math.max(0, required - intel.voteCount)
  const observed =
    nextTier == null
      ? "Stored vote count is " + intel.voteCount + ", which meets the Diamond threshold of " + DIAMOND_VOTES + "."
      : "Stored vote count is " +
        intel.voteCount +
        ". The next catalog tier is " +
        nextTier +
        " at " +
        required +
        " votes (" +
        remaining +
        " more) or a platform alternative of " +
        ethAlternative +
        " ETH."

  return {
    currentTier: intel.tier,
    nextTier,
    voteCount: intel.voteCount,
    votesRequiredForNextTier: required,
    votesRemaining: remaining,
    ethAlternative,
    perVoteEth: VOTE_ETH,
    observed,
    interpretation:
      "A single vote fee in the catalog is " +
      VOTE_ETH +
      " ETH. Reaching a threshold is not a prediction that the listing will get there. " +
      DISCLAIMER,
  }
}

function marketContext(intel) {
  const available =
    intel.marketPrice != null ||
    intel.marketCap != null ||
    intel.volume != null ||
    intel.liquidity != null ||
    intel.priceChange != null

  if (!available) {
    return {
      available: false,
      price: null,
      marketCap: null,
      volume: null,
      liquidity: null,
      priceChange: null,
      observed: "No market snapshot was supplied.",
      interpretation:
        "Price, market cap, volume, liquidity, and price movement are unavailable. " + DISCLAIMER,
    }
  }

  const parts = []
  if (intel.marketPrice != null) parts.push("price " + intel.marketPrice)
  if (intel.marketCap != null) parts.push("market cap " + intel.marketCap)
  if (intel.volume != null) parts.push("volume " + intel.volume)
  if (intel.liquidity != null) parts.push("liquidity " + intel.liquidity)
  if (intel.priceChange != null) parts.push("price change " + intel.priceChange)
  const stale = intel.stale.includes("market") ? " The snapshot is marked stale." : ""

  return {
    available: true,
    price: intel.marketPrice,
    marketCap: intel.marketCap,
    volume: intel.volume,
    liquidity: intel.liquidity,
    priceChange: intel.priceChange,
    observed: "Supplied market snapshot: " + parts.join(", ") + "." + stale,
    interpretation:
      "These figures are copied from the supplied snapshot. They are not a forecast. " + DISCLAIMER,
  }
}

function signalsFor(intel, progress, market) {
  const positive = []
  const neutral = []
  const caution = []

  if (intel.promotionStatus === "promoted") positive.push("Promotion status is stored as promoted.")
  if (intel.metadata && intel.metadata.audit === true) {
    positive.push("An audit link is stored on the listing. That does not confirm audit quality.")
  }
  if (intel.metadata && intel.metadata.kyc === true) {
    positive.push("A KYC link is stored on the listing. That does not confirm identity checks.")
  }
  if (intel.tier === "diamond" || intel.tier === "ruby") {
    positive.push("Stored votes meet the " + intel.tier + " catalog threshold.")
  }

  if (intel.metadata && intel.metadata.presale === true) neutral.push("The listing is marked as a presale.")
  if (intel.promotionStatus === "not_promoted") neutral.push("Promotion status is stored as not promoted.")
  neutral.push("Only one snapshot was supplied, so unusual changes cannot be determined.")

  if (intel.metadata && intel.metadata.audit === false) {
    caution.push("No audit link is stored on the listing.")
  }
  if (intel.metadata && intel.metadata.kyc === false) {
    caution.push("No KYC link is stored on the listing.")
  }
  if (intel.voteCount == null) caution.push("Vote count is unavailable.")
  if (!market.available) caution.push("Market price, market cap, and price movement were not supplied.")
  if (intel.stale.includes("market")) caution.push("The supplied market snapshot is stale.")
  if (intel.dataQuality === "insufficient") caution.push("The listing record does not contain enough data for a full reading.")
  if (progress.votesRemaining != null && progress.votesRemaining > 0) {
    caution.push(progress.votesRemaining + " stored votes remain before the next catalog tier threshold.")
  }

  return { positive, neutral, caution }
}

function availableFields(intel) {
  const fields = [
    ["name", intel.name],
    ["symbol", intel.symbol],
    ["contractAddress", intel.contractAddress],
    ["network", intel.network],
    ["listingDate", intel.listingDate],
    ["tier", intel.tier],
    ["voteCount", intel.voteCount],
    ["dailyVotingActivity", intel.dailyVotingActivity],
    ["recentVotingActivity", intel.recentVotingActivity],
    ["marketPrice", intel.marketPrice],
    ["marketCap", intel.marketCap],
    ["volume", intel.volume],
    ["liquidity", intel.liquidity],
    ["priceChange", intel.priceChange],
    ["communityActivity", intel.communityActivity],
    ["promotionStatus", intel.promotionStatus],
  ]
  return fields.filter((entry) => entry[1] != null).map((entry) => entry[0])
}

function buildAnalysis(intel) {
  const progress = listingProgress(intel)
  const market = marketContext(intel)
  const daily = intel.dailyVotingActivity ? intel.dailyVotingActivity.count : null
  const weekly = intel.recentVotingActivity ? intel.recentVotingActivity.count : null
  const watchlist = intel.communityActivity ? intel.communityActivity.watchlistCount : null
  const identity = [intel.name, intel.symbol].filter(Boolean).join(" ") || "This listing"

  const executiveObserved = [
    identity,
    intel.network ? "on " + intel.network : null,
    intel.tier ? "is stored at the " + intel.tier + " tier" : "has no stored tier",
    intel.voteCount == null ? "and vote count is unavailable" : "with " + intel.voteCount + " stored votes",
  ]
    .filter(Boolean)
    .join(" ")

  return {
    notFinancialAdvice: true,
    disclaimer: DISCLAIMER,
    dataQuality: intel.dataQuality,
    executiveSummary: section(
      executiveObserved + ".",
      "This restates the stored listing. It is not a prediction of price or demand. " + DISCLAIMER
    ),
    communityActivity: {
      votingActivity: section(
        "Vote count is " + shown(intel.voteCount) + ".",
        intel.voteCount == null
          ? "Voting activity cannot be described because the vote count is unavailable."
          : "The vote count is the stored total, not a forecast of future votes."
      ),
      votingMomentum: section(
        "Daily window count is " + shown(daily) + ". Weekly window count is " + shown(weekly) + ".",
        daily == null && weekly == null
          ? "Momentum cannot be described because both window counts are unavailable."
          : "These are stored window totals. They are not a trend forecast."
      ),
      communityParticipation: section(
        "Watchlist size is " + shown(watchlist) + ".",
        watchlist == null
          ? "Community participation cannot be counted because the watchlist was not supplied."
          : "Watchlist size counts stored entries. It is not a count of holders or users."
      ),
      unusualChanges: section(
        "No earlier snapshot was supplied.",
        "Unusual changes cannot be determined from a single snapshot."
      ),
    },
    marketContext: market,
    listingProgress: progress,
    notableSignals: signalsFor(intel, progress, market),
    dataQualityReport: {
      level: intel.dataQuality,
      available: availableFields(intel),
      missing: intel.missing.slice(),
      stale: intel.stale.slice(),
      timestamps: intel.timestamps,
      sources: intel.sources,
    },
    explanation: section(
      executiveObserved + ". " + market.observed + " " + progress.observed,
      "The sentences above separate stored metrics from catalog rules. Missing fields stay unavailable. " +
        DISCLAIMER
    ),
  }
}

function plainInterpretation(value) {
  if (typeof value !== "string") return null
  const text = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
  if (!text || text.length > 500) return null
  if (BANNED.some((pattern) => pattern.test(text))) return null
  if (blockedModelText(text)) return null
  return text
}

function numbersAreAllowed(text, observed) {
  const numbers = text.match(/\d+(?:\.\d+)?/g) || []
  return numbers.every((number) => observed.includes(number) || ALLOWED_CONSTANTS.includes(number))
}

function mergeInterpretations(analysis, content) {
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    return analysis
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return analysis

  const next = JSON.parse(JSON.stringify(analysis))
  const slots = [
    ["executiveSummary", next.executiveSummary],
    ["votingActivity", next.communityActivity.votingActivity],
    ["votingMomentum", next.communityActivity.votingMomentum],
    ["communityParticipation", next.communityActivity.communityParticipation],
    ["unusualChanges", next.communityActivity.unusualChanges],
    ["marketContext", next.marketContext],
    ["listingProgress", next.listingProgress],
    ["explanation", next.explanation],
  ]

  slots.forEach((slot) => {
    const text = plainInterpretation(parsed[slot[0]])
    if (!text) return
    if (!numbersAreAllowed(text, slot[1].observed)) return
    slot[1].interpretation = text
  })

  next.notFinancialAdvice = true
  next.disclaimer = DISCLAIMER
  next.dataQuality = analysis.dataQuality
  return next
}

function assertAnalysisSchema(analysis) {
  if (!analysis || typeof analysis !== "object") return false
  if (analysis.notFinancialAdvice !== true) return false
  if (analysis.disclaimer !== DISCLAIMER) return false
  if (!["high", "partial", "insufficient"].includes(analysis.dataQuality)) return false

  const pair = (value) =>
    value &&
    typeof value.observed === "string" &&
    typeof value.interpretation === "string"

  if (!pair(analysis.executiveSummary) || !pair(analysis.explanation)) return false
  const community = analysis.communityActivity
  if (
    !community ||
    !pair(community.votingActivity) ||
    !pair(community.votingMomentum) ||
    !pair(community.communityParticipation) ||
    !pair(community.unusualChanges)
  ) {
    return false
  }
  const market = analysis.marketContext
  if (!market || typeof market.available !== "boolean" || !pair(market)) return false
  const marketFields = ["price", "marketCap", "volume", "liquidity", "priceChange"]
  for (let i = 0; i < marketFields.length; i += 1) {
    const value = market[marketFields[i]]
    if (!(value == null || typeof value === "number")) return false
  }
  const progress = analysis.listingProgress
  if (!progress || !pair(progress)) return false
  const signals = analysis.notableSignals
  if (
    !signals ||
    !Array.isArray(signals.positive) ||
    !Array.isArray(signals.neutral) ||
    !Array.isArray(signals.caution)
  ) {
    return false
  }
  const quality = analysis.dataQualityReport
  if (
    !quality ||
    quality.level !== analysis.dataQuality ||
    !Array.isArray(quality.available) ||
    !Array.isArray(quality.missing) ||
    !Array.isArray(quality.stale) ||
    !quality.timestamps ||
    !quality.sources
  ) {
    return false
  }
  return true
}

module.exports = {
  DISCLAIMER,
  buildAnalysis,
  mergeInterpretations,
  assertAnalysisSchema,
}
