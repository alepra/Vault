## Bot Behavior Notes

### Scavenger Bots – Baseline IPO Liquidity (Agreed Spec)
- Scavenger bots should provide a predictable liquidity floor during IPOs.
- Rule: Each scavenger bot bids on all four companies with 250 shares at $1.00 per share.
- With three scavenger bots always included, this guarantees a baseline of 750 shares bid at a $1.00 floor for every company.
- Purpose: Ensure minimum demand/liquidity and stable price discovery without relying on emergency/after-the-fact bids.

### Future Enhancements (to consider later)
- Prevent scavengers from becoming CEOs (ownership cap or lower priority when nearing 35% ownership).
- Company quality/personality affects bot interest and bid sizing.
- Post-IPO trading reactions based on company performance (profits/losses) and bot personalities.

### Implementation Notes
- Current implementation can be adjusted to align exactly with this spec by:
  - For scavengers: deterministically placing 4 bids (one per company) at 250 shares, $1.00.
  - Removing randomness for scavenger participation in IPO; they always bid on all companies.
  - Keeping other bot types probabilistic/strategic as designed.


