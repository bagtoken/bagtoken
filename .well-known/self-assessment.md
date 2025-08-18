# 📋 XRPL Token Issuer Self-Assessment Questionnaire — $BAG

**Token Name:** $BAG  
**Ticker:** BAG  
**Chain:** XRP Ledger (XRPL)  
**Issuer Type:** Meme Token (non-redeemable, non-stablecoin)  
**Website:** [https://getthebag.io](https://getthebag.io)  
**Socials:**  
- X: [x.com/bagtoken](https://x.com/getthebag_io)  
- Telegram: [t.me/bagtoken](https://t.me/getthebag_io)  

---

## 1. Token Design
- **Total Supply:** 1,000,000,000,000 (1T)  
- **Decimals:** 6  
- **Treasury Wallet:** 700B BAG (Operations, OTC sales, listings, partnerships)  
- **Reserve Wallet:** 200B BAG (Long-term principal, optional burns, future incentives)  
- **Liquidity Wallet:** 100B BAG (Seeded on XRPL DEX at launch, paired only with XRP)  
- **Distribution:** OTC pre-sale from Treasury (one-way, no redemptions). Post-launch, open trading on XRPL DEX.  

---

## 2. Governance and Control
- **Issuer Control:** Freeze and Clawback are **not enabled**.  
- **Rippling:** **Enabled** (required for trust lines via Xaman and pathfinding).  
- **Blackhole / Key Locking:** Issuer mint key rotation will be completed post-distribution to prevent new issuance.  
- **Treasury Operations:** All OTC distributions come from Treasury wallet.  
- **Liquidity Guardrails:** Liquidity wallet funds are locked for XRP pairing, never sold to market.  

---

## 3. Redemption and Backing
- **Redemption Policy:** Not applicable — $BAG is not a stablecoin.  
- **Backing Assets:** None. Pure meme token.  
- **Guarantees:** No redemption for fiat or other assets.  

---

## 4. Compliance and Transparency
- **KYC / AML:** Buyers must comply with their local regulations. OTC is voluntary, transparent, and one-way.  
- **Public TOML:** Published at `https://getthebag.io/.well-known/xrp-ledger.toml`  
- **Self-Assessment:** This document. Publicly hosted for transparency.  
- **Listings:** Verified on Xaman, Bithomp, XRPSCAN, XRPLMeta.  

---

## 5. Technical Operations
- **Ledger Integration:** Standard XRPL token issued via `TrustSet` and `Payment` transactions.  
- **Freeze Setting:** Disabled.  
- **Clawback Setting:** Not enabled (not using Clawback amendment).  
- **Partial Payments:** Not used.  
- **Burns:** Reserve wallet may optionally burn tokens for supply control; otherwise supply remains fixed.  
- **AMM / DEX Use:** Liquidity seeded at launch with 100B BAG + $500k equivalent XRP. Public launch rate: $0.000003 per BAG.  

---

## 6. Risk Disclosures
- **Volatility:** Meme token, not a stablecoin — value may fluctuate widely.  
- **Issuer Policy:** No redemption guarantees, no fixed value.  
- **Buyer Risk:** OTC sales are one-way; buyers assume full market risk.  
- **Security:** Project wallets use rippling enabled (for trust lines) and mint key rotation for safety.  

---

## ✅ Declaration
The $BAG project provides this self-assessment publicly to ensure transparency with the XRPL community.  
While $BAG is meme-branded and carries no “formal” utility, it **inherits the underlying utility of XRPL** (instant payments, low fees, decentralized exchange trading).  

---

## 🔗 How to Publish
1. Save this file as `self-assessment.md` or export as PDF.  
2. Host at: `https://getthebag.io/.well-known/self-assessment.pdf`  
3. Add to TOML:  

```toml
[[DOCUMENTS]]
type = "Self-Assessment Questionnaire"
url  = "https://getthebag.io/.well-known/self-assessment.pdf"
```

