const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { rememberInsight, listInsights, resetInsightIndex } = require("./aiService")

describe("insight index", () => {
  it("lists saved analyses and does not invent a score", () => {
    resetInsightIndex()
    rememberInsight(
      "alpha1",
      {
        dataQuality: "high",
        executiveSummary: { observed: "Alpha ALP is stored at the ruby tier." },
      },
      1_000
    )
    rememberInsight("beta2", { dataQuality: "partial", executiveSummary: { observed: "Beta has no stored tier." } }, 1_000)

    const insights = listInsights(1_500)
    assert.equal(insights.length, 2)
    assert.equal(insights.some((item) => item.tokenId === "alpha1" && item.summary.includes("ruby")), true)
    assert.equal(Object.prototype.hasOwnProperty.call(insights[0], "score"), false)
    assert.equal(JSON.stringify(insights).includes("rank"), false)
  })

  it("drops expired entries", () => {
    resetInsightIndex()
    rememberInsight("alpha1", { dataQuality: "partial", executiveSummary: { observed: "Alpha." } }, 1_000)
    assert.equal(listInsights(1_000 + 60 * 60 * 1000).length, 0)
  })
})
